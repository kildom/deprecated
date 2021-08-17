
#precompiler 100		

///////////// VERTEX MAIN
#shader mainv(scale, trans[4], mymat[16])

#version 120 /*  jednam 
dwa
linia */const vect4 t = vect4(trans); // sta³a

void main(void)
{
	gl_Position = scale * ftransform() + vec4(trans);
}

///////////// FRAGMENT MAIN
#shader mainf()

#version 120

void main(void)
{
	gl_FragColor = coloró6;
}

#shader xyz

void main(void)
{
}


