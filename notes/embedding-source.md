
### Embedding inside bytecode

* Source code can be embedded to output bytecode to allow later edit
* The tool that compiles and uploads the bytecode is responsible for embedding format
  * Bytecode only provides space for embedding and know nothing about format.
* The code is compressed using modern compression algorithm, e.g. zstd or brotli or both (depending which gets best results).
* Special decompiler should be created that is able to decompile bytecode into source code.
  * The output does not to be percise, but it must be deterministic.
  * If some information is lost, e.g. local variables names, the output will skip it (don't put dummy content).
  * The decompiler can take few parameters, e.g. indentation, line ending format
* Decompiled code will be used as an initial dictionary for compression algoritm.
* For brotli, build-in dictionary may be replaced by different one optimized for JavaScript/TypeScript only.
* For zstd, initial dictionary can be extended by dictionary optimized for JavaScript/TypeScript.
* The file structure should be represented in text form to avoid mixing binary data with text, e.g.:
  * `file_name:bytes_in_dec:content` `directory_name::` `file_in_directory:bytes_in_dec:content` `::` `back_in_parent_directory:...`
* The embedded block will contain:
  * Format ID - unique string,
  * Decompiler id
  * Decompiler parameters
  * Compression algorithm id
  * Compressed data

### Embedding reference

(useful if sources cannot fit into memory)

* The tool should be able also embed reference to external resources, e.g. git repository
* The embedded block will contain:
  * Format ID - unique string, different than embedding source code directly, e.g. `URL`, `git`
  * URL:
    * URL to archive containing the sources (may be also `file:///`)
  * git:
    * Repository URLs (may be multiple to provide fallbacks)
    * Commit hash
    * Path within the repository
  * Format of the content, e.g. files stored directly, or ZIP, or the same as in "embedded block" above,
  * SHA-256 Hash of the content (plain file structure must be normalized before calculating hash).

The embedded block should start with some nice format, e.g. JSON:
```javascript
{"format":"emb","compress":"zstd","dec":{"nl":"\n","ind":"    ","hash":"185637af796dbac95c7cc467d11f61cff986b6a2"}}\0...binary_data...
{"format":"git","urls":["https://github.com/example/repo"],"commit":"5d4f0533290ae8472a6330a9fb781c3d1de51b16","hash":"185637af796dbac95c7cc467d11f61cff986b6a2"}
```
The archive format should also allow prorecting it with a password or key.

