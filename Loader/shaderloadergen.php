<?

function write($n) {
	if ($n <= 16) {
?>
_shaderloader_defParamN(<?=$n?>,(const ShaderLoaderParam<?=$n?>& param<? for ($i=0; $i<$n; $i++) echo ",int a$i"; ?>),(const ShaderLoaderParam<?=$n?>& param<? for ($i=0; $i<$n; $i++) echo ",float a$i"; ?>),(const ShaderLoaderParam<?=$n?>& param<? for ($i=0; $i<$n; $i++) echo ",double a$i"; ?>)<? for ($i=0; $i<$n; $i++) echo ",a$i"; ?>)
<?;
	} else {
?>
_shaderloader_defParamNoDirN(<?=$n?>)
<?;
	}
};

for ($i=1; $i<=64; $i++) {
	ob_start();
	write($i);
	$c = ob_get_contents();
	ob_end_clean();
	$c = strtr($c, ' ,', ', ');
	$c = wordwrap($c, 120, " \r\n\t");
	$c = strtr($c, ' ,', ', ');
	echo $c;
}
