
function filter(entry) {
	/* entry object fields:
	 *     sec     : string  Section name
	 *     addr    : number  Address of the symbol
	 *     size    : number  Size of the symbol
	 *     library : string  Source library name or empty string if file was linked directly
	 *     file    : string  Source object file name
	 *     memory  : string  Memory name where the symbol is located
	 *
	 * filter() function returns:
	 *     - false to completely ignore this entry in the report.
	 *     - true to add this entry to the report as uncategorized.
	 *     - string containing category. Subcategories are separated by ';' sign (without whitespace).
	 */

	if (entry.sec.match(/^(\.debug|.comment|\.ARM\.attributes)/)) return false;

	if (entry.library.endsWith('libopusmini.a')) return 'opus';
	if (entry.file.startsWith('../dist/obj/libopusmini/opus/celt')) return 'opus;celt';
	if (entry.file.startsWith('../dist/obj/libopusmini/opus/silk')) return 'opus;silk';
	if (entry.file.startsWith('../dist/obj/libopusmini/opus')) return 'opus;root';
	if (entry.file.startsWith('/tmp/')) return 'main';
	return 'std';
}
