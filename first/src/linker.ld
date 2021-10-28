
/*
Input symbols (for gcc use "-Wl,--defsym=NAME=VALUE"):
TARGET_RAM_ADDR = RAM address
TARGET_RAM_SIZE = total RAM size
TARGET_BL_START = start address of the first bootloader
TARGET_RAM_USAGE = size of RAM used by the first bootloader
*/

SEARCH_DIR(.)
GROUP(-lgcc -lc -lnosys)

MEMORY
{
  FLASH      (rx)  : ORIGIN = TARGET_BL_START, LENGTH = ((TARGET_BL_START + 0x1000) & 0x7FFFF000) - TARGET_BL_START
  RAM        (rw)  : ORIGIN = TARGET_RAM_ADDR, LENGTH = TARGET_RAM_SIZE
}

OUTPUT_FORMAT ("elf32-littlearm", "elf32-bigarm", "elf32-littlearm")

SECTIONS
{
    _LS_STACK_SIZE = 512;

    .text :
    {
        KEEP(*(.boot_isr*))
        *(.text*)
        *(.rodata*)
        . = ALIGN(4);
        KEEP(*(.isrcopy*))
    } > FLASH

    . = ALIGN(4);
    __etext = .;

    .bss :
    {
        . = ORIGIN(RAM) + LENGTH(RAM) - TARGET_RAM_USAGE;
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
        __conf_text_start__ = (__conf_start__ - __data_start__) + __etext;
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

}
