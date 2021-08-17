
#include <windows.h>
#include <stdlib.h>
#include <gl/gl.h>
#include "extloader.h"
#include "shaderloader.h"

void xglShaderCompiledSource(unsigned int shader, const ShaderLoaderStrings& source)
{
	int n = 0;
	char* str[3];
	int len[3];
	if (source.version) {
		str[n] = source.version;
		len[n++] = strlen(source.version);
	}
	if (source.prepare) {
		str[n] = source.prepare;
		len[n++] = strlen(source.prepare);
	}
	if (source.execute) {
		str[n] = source.execute;
		len[n++] = strlen(source.execute);
	}
	glShaderSource(shader, n, str, len);
}

void xglShaderCompiledParamN(int n, const ShaderLoaderParamN* param, int* vect)
{
	char* ptr = param->buffer;
	for (int i=0; i<n; i++) {
		_itoa(vect[i], ptr, 10);
		int len = strlen(ptr);
		ptr += len;
		if (i < n-1) *ptr++ = ',';
	}
	memset(ptr, ' ', param->length - (ptr - param->buffer));
}

template<class T>
inline void xglShaderCompiledParamN(int n, const ShaderLoaderParamN* param, T* vect)
{
	char* ptr = param->buffer;
	for (int i=0; i<n; i++) {
		_gcvt_s(ptr, 32, (double)vect[i], 20);
		int len = strlen(ptr);
		ptr += len;
		if (i < n-1) *ptr++ = ',';
	}
	memset(ptr, ' ', param->length - (ptr - param->buffer));
}

void xglShaderCompiledParamN(int n, const ShaderLoaderParamN* param, float* vect)
{
	xglShaderCompiledParamN<float>(n, param, vect);
}

void xglShaderCompiledParamN(int n, const ShaderLoaderParamN* param, double* vect)
{
	xglShaderCompiledParamN<double>(n, param, vect);
}


