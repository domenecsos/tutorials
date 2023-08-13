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
var md="@@title@@\n\n@@ToC@@\n\n";
var toc = [];

const twoNl="\n\n";
const anchorStart="@1@(";
const anchorFinish=")@1@";

// Iterar y acumular los md
for ( var i=0; i<mds.length; i++ ) {

	// Completar última linea si no tiene \n final y separar nuevo contenido con linea(s) en blanco
	if ( i>0 ) 
		md= md+twoNl; 
	
	md= md+ anchorStart+file2anchor(mds[i])+anchorFinish+twoNl;

	// Lectura del markdown sincrona, ZFFGT que sea sincrona
	var txt=fs.readFileSync(mds[i], 'utf8');
	md= md+txt;

	var t = txt.match(/^# .*$/gm);
	toc.push( t.length<1? mds[i]: t[0].substring(2) );
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
		var tempFile = htmlOutputFile+".tmp";
		var stream = fs.createWriteStream(tempFile);
		markdown.pipe(stream);
		stream.on('finish', () => {
			beautifyHTML(tempFile,htmlOutputFile);
			fs.unlinkSync(tempFile);
        });
	} else {
		markdown.pipe(process.stdout);
	}

});

function beautifyHTML(temp,file) {
	
	var html = fs.readFileSync(temp, 'utf8');

	var html = html.replace('<head>', '<head><meta charset="utf-8">');
	html = html.replaceAll('<pre><code>', '<div class="codigo"><pre><code>');
	html = html.replaceAll('</code></pre>', '</code></pre></div>');

	html = html.replaceAll(anchorStart,'<a name="').replaceAll(anchorFinish,'" />');
	
	for ( var i=0; i<mds.length; i++ ) {
		html = html.replaceAll(' href="'+mds[i]+'"',' href="#'+file2anchor(mds[i])+'"');
	}
	
	html = html.replaceAll("@@title@@", '<h1>'+title+'</h1>');

	html = html.replaceAll("@@ToC@@", getToC());

	fs.writeFile(file, html, function(){});
}

function file2anchor(file) {
	return file.replaceAll('.','_').replaceAll('/','_').replaceAll('-','_');
}

function getToC() {
	
	var t='<ul>';

	for ( var i=0; i<mds.length; i++ ) {
		t=t+'<li><a href="#'+file2anchor(mds[i])+'">'+toc[i]+'</a>.</li>'+"\n";
	}	
	
	return t+"</ul>\n";
}