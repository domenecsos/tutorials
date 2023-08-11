/*
npm install yargs
npm install markdown-to-html

https://www.npmjs.com/package/markdown-to-html

*/
'use strict';

var fs = require('fs');
 
// https://github.com/yargs/yargs/issues/334
var argv = require('yargs')
  .usage("Concatenar ficheros de Markdown como un único HTML con estilos.\nUsage: $0 [options] <md>")
  .version("0.0.1")
  .strict()
  .option('o', {
    alias: 'output',
    describe: 'HTML output file',
    type: 'string'
  })
  .option('c', {
    alias: 'css',
    describe: 'CSS stylesheet',
    type: 'string'
  })
  .option('m', {
    alias: 'markdown',
    describe: 'Intermediate Markdown file containing all input md files. Default: _all.md',
    type: 'string'
  })
  .option('t', {
    alias: 'title',
    describe: 'Title of the HTML document. Default: Title?',
    type: 'string'
  })
  .help('h').alias('h', 'help')
  .demand(1) // at least one "flagless" argument required for <md>
  .example('$0 -h', 'Prints this help text')
  .example('$0 a.md b.md', 'Concatena a.md y b.md y los muestra como HTML por stdout.')
  .example('$0 -o z.html a.md b.md', 'Concatena a.md y b.md y los escribe como HTML en z.html.')
  .example('$0 -o z.html --css x.css a.md b.md', 'Concatena a.md y b.md y los escribe como HTML en z.html que incluye la hoja de estilos x.css.')
  .argv // this actually parses the arguments to the program and returns them as an object

// console.log(argv);

// Variables globales a partir de argumentos
var htmlOutputFile = argv.output;
var mds = argv._;
var allMd = argv.markdown? argv.markdown: '_all.md'; 
var title = argv.title? argv.title: 'Title?'; 
var css = argv.css;

// -------------------------------------------------------
// Acumular los MD
// -------------------------------------------------------

// Buffer para acumular los md.
var md='';

// Iterar y acumular los md
for ( var i=0; i<mds.length; i++ ) {

	// Completar última linea si no tiene \n final y separar nuevo contenido con linea(s) en blanco
	if ( i>0 ) 
		md= md+"\n\n"; 

	// Lectura del markdown sincrona, ZFFGT que sea sincrona
	md= md+fs.readFileSync(mds[i], 'utf8');
}

fs.writeFile(allMd, md, function(){});

// -------------------------------------------------------
// Transformar a HTML
// -------------------------------------------------------

// Buffer transformar en HTML.
var html='';

var Markdown = require('markdown-to-html').Markdown;
var markdown = new Markdown();
markdown.bufmax = 2048;
//var opts = {title: 'File $BASENAME in $DIRNAME', stylesheet: 'test/style.css'};
var opts = { title:title, stylesheet: css };
/*
md.once('end', function() {
  console.log('===============================');
});
*/


markdown.render(allMd, opts, function(err) {

	if (err) {
		console.error('>>>' + err);
		process.exit();
	}
  
	// Dump final
	if ( htmlOutputFile ) {
		markdown.pipe(fs.createWriteStream(htmlOutputFile));
		beautifyHTML(htmlOutputFile);
	} else {
		markdown.pipe(process.stdout);
	}
});

function beautifyHTML(file) {
	
	var html = fs.readFileSync(file, 'utf8');

	var html = html.replace('<head>', '<head><meta charset="utf-8">');
	html = html.replaceAll('<pre><code>', '<div class="codigo"><pre><code>');
	html = html.replaceAll('</code></pre>', '</code></pre></div>');

	fs.writeFile("avp2.html", html, function(){});
}

/* TODO
Pipejar markdown a un string, beautify it i llavors si gravar o mostrar pantalla
Provar si Word agafa imatges.
Modificar els links interns, i mirar si arriben a un PDF.
*/
