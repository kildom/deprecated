
/*
Input symbols (for gcc use "-Wl,--defsym=NAME=VALUE"):
_LS_RAM_SIZE = total RAM size
_LS_BL_START = start address of the first stage bootloader
_LS_RAM_USAGE = size of RAM used by the first stage bootloader
*/

SEARCH_DIR(.)
GROUP(-lgcc -lc -lnosys)

MEMORY
{
  FLASH      (rx)  : ORIGIN = _LS_BL_START, LENGTH = ((_LS_BL_START + 0x1000) & 0x7FFFF000) - _LS_BL_START
  RAM        (rw)  : ORIGIN = 0x20000000, LENGTH = _LS_RAM_SIZE
  DUMMY      (rw)  : ORIGIN = 0x40000000, LENGTH = 8
}

OUTPUT_FORMAT ("elf32-littlearm", "elf32-bigarm", "elf32-littlearm")

SECTIONS
{
    _LS_STACK_SIZE = 512;

    .text :
    {
        KEEP(*(.mbr_reset_copy))
        KEEP(*(.startup))
        *(.text*)
        *(.rodata*)
    } > FLASH

    . = ALIGN(4);
    __etext = .;

    .bss :
    {
        . = ORIGIN(RAM) + LENGTH(RAM) - _LS_RAM_USAGE;
        *(.bss*)
        *(COMMON*)
        . = ALIGN(4);
    } > RAM

    .data : AT (__etext)
    {
        __data_start__ = .;
        *(.data*)
        . = ALIGN(4);
        __conf_start__ = .;
        KEEP(*(.conf*))
        . = ALIGN(4);
        __data_end__ = .;
    } > RAM

    .noinit :
    {
        KEEP(*(.noinitconf*))
        *(.noinit*)
        . = ORIGIN(RAM) + LENGTH(RAM) - _LS_STACK_SIZE;
    } > RAM

    .publicinfo :
    {
        KEEP(*(.publicinfo*))
    } > DUMMY

}
