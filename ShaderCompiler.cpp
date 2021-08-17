
#include <stdlib.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

/*

TODO:

#common	name(param, ...)
	Kod wspó³dzielony, mo¿e zostaæ dodany do dowolnego shadera

#using common_name(value, ...)
	U¿yj wspó³dzielonego bloku, parametry przekazywane s¹ przez:
	#define common_name_param value
	... body ...
	#undef common_name_param

#include "file"
#include <file>

*/

class Exception { };

char* output[128];
FILE* out[128];
int outputCount = 0;
char* input = 0;
FILE* in = 0;
char* includeFileName = 0;

bool parseArgs(int argc, char* argv[])
{
	int state = 0;

	for (int i=1; i<argc; i++) {
		switch (state)
		{
		case 0:
			if (argv[i][0] == '-' || argv[i][0] == '/') {
				if (strcmp(argv[i]+1, "i") == 0) {
					if (includeFileName) return false;
					state = 1;
				} else if (strcmp(argv[i]+1, "o") == 0) {
					state = 2;
				} else {
					return false;
				}
			} else {
				if (input) return false;
				input = argv[i];
			}
			break;

		case 1:
			includeFileName = argv[i];
			state = 0;
			break;

		case 2:
			if (outputCount > sizeof(output)/sizeof(output[0])) return false;
			output[outputCount] = argv[i];
			outputCount++;
			state = 0;
			break;
		}
	}

	if (includeFileName == 0) {
		includeFileName = "shaderloader.h";
	}

	return true;
}

void usage()
{
	puts("ShaderPrecompiler [/l c|cpp] [/o out1] [/o out2] ... [input]");
	puts("  /l      - output language");
	puts("  outN    - output file, for c/c++:");
	puts("            out1 - source file");
	puts("            out2 - header file");
	puts("  input   - input file");
	puts("");
}

char lineBuffer[4096];
char* line;
int lineNumber;
bool lineAtComment = false;

bool readLine()
{
	lineNumber++;
	char* r = fgets(lineBuffer, sizeof(lineBuffer), in);
	if (!r) {
		if (feof(in)) return false;
		fprintf(stderr, "%s(%d) : error 2: Can not read from input file\n", input, lineNumber);
		throw Exception();
	}
	char* ptr = lineBuffer;
	if (lineAtComment) {
		while (true) {
			if (!ptr[0]) {
				lineBuffer[0] = 0;
				break;
			}
			if (ptr[0] == '*' && ptr[1] == '/') {
				strcpy(lineBuffer, ptr+2);
				lineAtComment = false;
				break;
			}
			ptr++;
		}
		ptr = lineBuffer;
	}
	while (ptr[0]) {
		if (ptr[0] == '/' && ptr[1] == '/') {
			ptr[0] = 0;
			break;
		}
		if (ptr[0] == '/' && ptr[1] == '*') {
			char* start = ptr;
			ptr += 2;
			while (true) {
				if (!ptr[0]) {
					lineAtComment = true;
					start[0] = 0;
					break;
				}
				if (ptr[0] == '*' && ptr[1] == '/') {
					strcpy(start, ptr + 2);
					break;
				}
				ptr++;
			}
			ptr = start - 1;
		}
		ptr++;
	}
	line = lineBuffer;
	while (*line > 0 && *line <= ' ') line++;
	if (!line[0]) return readLine();
	ptr = line + strlen(line) - 1;
	while (*ptr > 0 && *ptr <= ' ') ptr--;
	ptr[1] = 0;
	if (!line[0]) return readLine();
	return true;
}

void walkSpaces(char* &ptr)
{
	while (*ptr > 0 && *ptr <= ' ') ptr++;
}

void walkName(char* &ptr)
{
	while ((*ptr >= 'a' && *ptr <= 'z')
		|| (*ptr >= 'A' && *ptr <= 'Z')
		|| (*ptr >= '0' && *ptr <= '9')
		|| (*ptr == '_')) ptr++;
}

int walkInt(char* &ptr)
{
	walkSpaces(ptr);
	bool minus = false;
	if (*ptr == '-') {
		minus = true;
		ptr++;
		walkSpaces(ptr);
	}
	char* str = ptr;
	while (*ptr >= '0' && *ptr <= '9') ptr++;
	int len = ptr - str;
	if (len > 20) return 0;
	char tmp[21];
	memcpy(tmp, str, len);
	tmp[len] = 0;
	if (minus) {
		return -atoi(tmp);
	} else {
		return atoi(tmp);
	}
}

int precompilerVersion = 0;
int sourceLineNumber;
bool isShader;
bool isSourceInShader;

void startOutputs()
{
	char* text;
	fprintf(out[0], "\n#ifdef PRECOMPILER_VERSION\n#undef PRECOMPILER_VERSION\n#endif\n#define PRECOMPILER_VERSION %d\n\n", precompilerVersion);
	fprintf(out[0], "#include \"%s\"\n\n", includeFileName);
	if (out[1]) {
		text = "#ifndef _shader_";
		fwrite(text, 1, strlen(text), out[1]);
		char* tmp;
		if (output[1]) {
			text = output[1] + strlen(output[1]);
			while (text > output[1] && *text != '\\' && *text != '/') {
				text--;
			}
			tmp = new char[strlen(text) + 1];
			strcpy(tmp, text);
			text = tmp;
			while (*text) {
				if (!((*text >= 'a' && *text <= 'z')
					|| (*text >= 'A' && *text <= 'Z')
					|| (*text >= '0' && *text <= '9')))
				{
					*text = '_';
				}
				text++;
			}
		} else {
			tmp = new char[10];
			strcpy(tmp, "_unknown");
		}
		fwrite(tmp, 1, strlen(tmp), out[1]);
		text = "\n#define _shader_";
		fwrite(text, 1, strlen(text), out[1]);
		fwrite(tmp, 1, strlen(tmp), out[1]);
		fprintf(out[1], "\n\n#ifdef PRECOMPILER_VERSION\n#undef PRECOMPILER_VERSION\n#endif\n#define PRECOMPILER_VERSION %d\n\n", precompilerVersion);
		fprintf(out[1], "#include \"%s\"\n\n", includeFileName);
		delete[] tmp;
	}
}

void precompilerDirective(char* param)
{
	if (precompilerVersion != 0) {
		fprintf(stderr, "%s(%d) : error 16: Multiple #precompiler directive\n", input, lineNumber);
		return;
	}
	if (strcmp(param, "100") != 0) {
		fprintf(stderr, "%s(%d) : error 4: Unsupported version\n", input, lineNumber);
	}
	precompilerVersion = 0x100;
	isShader = false;
	startOutputs();
}

void checkVersion()
{
	if (precompilerVersion == 0) {
		fprintf(stderr, "%s(%d) : error 6: Use #precompiler directive first\n", input, lineNumber);
		precompilerDirective("100");
	}
}

void printEscape(FILE* f, char* src)
{
	char buf[1024];
	char *dst = buf;
	int lastOct = 0;
	while (*src) {
		char c = *src++;
		if (c > 0 && c < ' ') {
			*dst++ = '\\';
			if (c == '\n') {
				*dst++ = 'n';
			} else if (c == '\t') {
				*dst++ = 't';
			} else if (c == '\v') {
				*dst++ = 'v';
			} else if (c == '\b') {
				*dst++ = 'b';
			} else if (c == '\r') {
				*dst++ = 'r';
			} else if (c == '\f') {
				*dst++ = 'f';
			} else if (c == '\a') {
				*dst++ = 'a';
			} else {
				*dst++ = '0' + ((c >> 3) & 0x7);
				*dst++ = '0' + (c & 0x7);
				*dst++ = '"';
				*dst++ = '"';
				lastOct = 2;
			}
		} else if (c == '\\') {
			*dst++ = '\\';
			*dst++ = '\\';
		} else if (c == '\'') {
			*dst++ = '\\';
			*dst++ = '\'';
		} else if (c == '\"') {
			*dst++ = '\\';
			*dst++ = '"';
		} else if (c & 0x80) {
			*dst++ = '\\';
			*dst++ = '0' + ((c & 0xFF) >> 6);
			*dst++ = '0' + ((c >> 3) & 0x7);
			*dst++ = '0' + (c & 0x7);
			lastOct = 2;
		} else {
			if (lastOct && c >= '0' && c <= '7') {
				*dst++ = '"';
				*dst++ = '"';
			}
			*dst++ = c;
		}
		if (lastOct) lastOct--;
		if (dst > buf + 1000) {
			fwrite(buf, 1, dst - buf, f);
			dst = buf;
		}
	}
	if (dst != buf) {
		fwrite(buf, 1, dst - buf, f);
	}
}

char* versionLine;

void endShader()
{
	if (isShader) {
		if (!isSourceInShader) {
			fprintf(out[0], "\"\"");
			fprintf(stderr, "%s(%d) : warning 1002: No source code in shader\n", input, lineNumber);
		}
		if (versionLine) {
			fprintf(out[0], ",\n\t\t\"");
			printEscape(out[0], versionLine);
			fprintf(out[0], "\\n\"\n\t}\n};\n\n");
			delete[] versionLine;
			versionLine = 0;
		} else {
			fprintf(out[0], ",\n\t\t0\n\t}\n};\n\n");
		}
		isShader = false;
	}
}

struct ParamInfo
{
	ParamInfo* next;
	int dim;
	int start;
	int length;
	char name[4];
};

void shaderDirective(char* param)
{
	checkVersion();
	endShader();
	if (versionLine) delete[] versionLine;
	versionLine = 0;
	sourceLineNumber = -1000;
	isShader = true;
	char* name = param;
	walkName(param);
	char* nameEnd = param;
	walkSpaces(param);
	if (param[0] != 0 && param[0] != '(') {
		fprintf(stderr, "%s(%d) : error 7: Parameters or end of directive expected\n", input, lineNumber);
	}
	bool predef = param[0] == '(';
	if (predef) {
		param++;
		walkSpaces(param);
		if (param[0] == ')') predef = false;
	}
	nameEnd[0] = 0;

	if (predef) {

		ParamInfo* firstParam = 0;
		ParamInfo* lastParam = 0;
		ParamInfo* pi;
		int paramCount = 0;
		char nextChar = 0;

		if (out[1]) fprintf(out[1], "typedef struct {\n");
		fprintf(out[0], "typedef struct {\n");

		do {

			char* paramName = param;
			walkName(param);
			int paramNameLen = param - paramName;
			if (paramNameLen == 0) {
				fprintf(stderr, "%s(%d) : error 10: Expected shader parameter\n", input, lineNumber);
				param[0] = ')';
				break;
			}
			walkSpaces(param);

			int paramDim = 1;

			if (param[0] == '[') {
				param++;
				walkSpaces(param);
				paramDim = walkInt(param);
				if (paramDim <= 0) {
					paramDim = 1;
					fprintf(stderr, "%s(%d) : error 12: Invalid shader parameter dimension\n", input, lineNumber);
					break;
				}
				walkSpaces(param);
				if (param[0] != ']') {
					fprintf(stderr, "%s(%d) : error 11: Expected ']'\n", input, lineNumber);
					break;
				}
				param++;
				walkSpaces(param);
			}

			nextChar = param[0];

			paramName[paramNameLen] = 0;

			if (out[1]) fprintf(out[1], "\tShaderLoaderParam%d %s;\n", paramDim, paramName);
			fprintf(out[0], "\tShaderLoaderParam%d %s;\n", paramDim, paramName);

			pi = (ParamInfo*)new char[sizeof(ParamInfo) + strlen(paramName)];
			pi->next = 0;
			strcpy(pi->name, paramName);
			pi->dim = paramDim;
			if (lastParam) {
				lastParam->next = pi;
			} else {
				firstParam = pi;
			}
			lastParam = pi;

			if (nextChar == ',') {
				param++;
				walkSpaces(param);
			} else if (nextChar == ')') {
				break;
			} else {
				fprintf(stderr, "%s(%d) : error 13: Expected ')' or ','\n", input, lineNumber);
				break;
			}

		} while (1);

		if (nextChar == ')') {
			param++;
			walkSpaces(param);
			if (param[0] != 0) {
				fprintf(stderr, "%s(%d) : error 14: Expecting end of directive\n", input, lineNumber);
			}
		}

		if (out[1]) fprintf(out[1], "\tShaderLoaderStrings source;\n} _%s_ShaderLoaderStruct;\n\n", name);
		fprintf(out[0], "\tShaderLoaderStrings source;\n} _%s_ShaderLoaderStruct;\n\n", name);

		fprintf(out[0], "static char _%s_prepareString[] =", name);
		int prepareLen = 0;
		pi = firstParam;
		while (pi) {
			// -0.450359962737049600e-1024,
			fprintf(out[0], "\n\t\"#define %s ", pi->name);
			prepareLen += 9 + strlen(pi->name);
			pi->start = prepareLen;
			for (int i=0; i<pi->dim; i++) {
				if (i != 0 && ((i&3) == 0)) fprintf(out[0], "\"\n\t\t\"");
				fprintf(out[0], "0%c                              ", i < pi->dim-1 ? ',' : ' ');
				prepareLen += 32;
			}
			pi->length = prepareLen - pi->start;
			fprintf(out[0], "\\n\"");
			prepareLen += 1;
			pi = pi->next;
		}
		fprintf(out[0], ";\n\n");

		if (out[1]) fprintf(out[1], "extern _%s_ShaderLoaderStruct %s;\n\n", name, name);
		fprintf(out[0], "_%s_ShaderLoaderStruct %s = {", name, name);
		pi = firstParam;
		while (pi) {
			fprintf(out[0], "\n\t{ _%s_prepareString + %d, %d },", name, pi->start, pi->length);
			pi = pi->next;
		}
		fprintf(out[0], "\n\t{\n\t\t_%s_prepareString,", name);

		pi = firstParam;
		while (pi) {
			ParamInfo* next = pi->next;
			delete[] (char*)pi;
			pi = next;
		}

	} else {

		if (out[1]) fprintf(out[1], "extern DefaultShaderLoaderStruct %s;\n\n", name);
		fprintf(out[0], "DefaultShaderLoaderStruct %s = {\n\t{\n\t\t0,", name);

	}

	isSourceInShader = false;
}

void checkShader()
{
	if (!isShader) {
		char text[5];
		strcpy(text, "_");
		shaderDirective(text);
		fprintf(stderr, "%s(%d) : error 8: Use #shader directive first\n", input, lineNumber);
	}
}

void versionDirective(char* line)
{
	checkShader();
	if (versionLine) {
		fprintf(stderr, "%s(%d) : error 15: Multiple #version directive\n", input, lineNumber);
	} else {
		versionLine = new char[strlen(line) + 1];
		memcpy(versionLine, line, strlen(line) + 1);
	}
}

void sourceLine(char* line)
{
	checkShader();
	isSourceInShader = true;
	if (sourceLineNumber != lineNumber) {
		if (sourceLineNumber >= lineNumber-4 && sourceLineNumber < lineNumber) {
			fwrite("\n\t\t\"\\n\"\n\t\t\"\\n\"\n\t\t\"\\n\"\n\t\t\"\\n\"\n\t\t\"\\n\"", 1, 7*(lineNumber - sourceLineNumber), out[0]);
		} else {
			fprintf(out[0], "\n\t\t\"#line %d\\n\"", lineNumber - 1);
		}
		sourceLineNumber = lineNumber;
	}
	fwrite("\n\t\t\"", 1, 4, out[0]);
	printEscape(out[0], line);
	fwrite("\\n\"", 1, 3, out[0]);
	sourceLineNumber++;
}

void parseInput()
{
	if (input) {
		in = fopen(input, "r");
	} else {
		input = "stdin";
		in = stdin;
	}
	if (!in) {
		fprintf(stderr, "%s : error 1: Can not open input file\n", input);
		throw Exception();
	}

	lineNumber = 0;
	char* ptr = line;
	while (readLine()) {
		ptr = line;
		if (ptr[0] == '#') {
			ptr++;
			walkSpaces(ptr);
			char* name = ptr;
			walkName(ptr);
			char* nameEnd = ptr;
			walkSpaces(ptr);
			if (nameEnd - name > 0) {
				if (memcmp(name, "precompiler", __min(11, nameEnd - name)) == 0) {
					precompilerDirective(ptr);
				} else if (memcmp(name, "shader", __min(6, nameEnd - name)) == 0) {
					shaderDirective(ptr);
				} else if (memcmp(name, "version", __min(7, nameEnd - name)) == 0) {
					versionDirective(line);
				} else if (memcmp(name, "line", __min(4, nameEnd - name)) == 0) {
					fprintf(stderr, "%s(%d) : warning 1001: #line directive not fully implemented\n", input, lineNumber);
					sourceLine(line);
				} else {
					sourceLine(line);
				}
			} else {
				sourceLine(line);
			}
		} else {
			sourceLine(line);
		}
	}
	if (in && in != stdin) fclose(in);
	in = 0;
}

void openOutputs()
{
	if (outputCount == 0) outputCount = 1;
	for (int i=0; i<outputCount; i++) {
		out[i] = 0;
	}
	for (int i=0; i<outputCount; i++) {
		if (output[i]) {
			out[i] = fopen(output[i], "w");
		} else {
			out[i] = stdout;
		}
		if (!out[i]) {
			if (!output[i]) output[i] = "stdout";
			fprintf(stderr, "%s : error 3: Can not open output file\n", output[i]);
			throw Exception();
		}
	}
}


void endOutputs()
{
	endShader();
	if (out[1]) {
		char* text = "\n#endif";
		fwrite(text, 1, strlen(text), out[1]);
	}
}

int main(int argc, char* argv[])
{
	int r = 0;

	if (!parseArgs(argc, argv)) {
		usage();
		return 1;
	}

	try {

		openOutputs();
		parseInput();
		endOutputs();

	} catch (Exception) {
		r = 2;
	}

	if (in && in != stdin) fclose(in);
	for (int i=0; i<outputCount; i++) {
		if (out[i] && out[i] != stdout) fclose(out[i]);
	}

	return r;
}

