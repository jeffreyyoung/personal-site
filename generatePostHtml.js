var path = require('path');
var Promise = require("bluebird");
var matter = require('gray-matter');
var fs = Promise.promisifyAll(require("fs")),
	slug = require('slug')
	glob = require('glob'),
	showdown  = require('showdown'),
	converter = new showdown.Converter();

const generatedFilesDirectory = '.posts';

	// options is optional
glob("posts/**/*.md", {}, async function (er, filePaths) {
	const files = await readFilesToString(filePaths);
	const parsedFiles = parseFiles(files, filePaths);
	createSummaryJson(parsedFiles)
	generateIndividualPostJSON(parsedFiles);
	generatePostsJSONDb(parsedFiles);
})

function parseFiles(files, filePaths) {
	return files
		.map(matter)
		.map((matterData,i) => {
			let parsedFile = Object.assign(matterData, {
				path: filePaths[i],
				html: converter.makeHtml(matterData.content)
			});
			
			let data = parsedFile.data;
			const splitPath = parsedFile.path.split('/');
			if (!data.category && splitPath.length >= 3) {
				data.category = splitPath[1];
			} else if (!data.category) {
				data.category = 'post';
			}
			
			if (!data.page) {
				data.page = 'post'
			}
			
			if (!data.url) {
				data.url = '/' + slug(data.category).toLowerCase() + '/' + slug(data.title).toLowerCase()
			}
			return Object.assign(parsedFile, {data: data})
		})
}

async function readFilesToString(filePaths) {
	return Promise.all(filePaths.map((filePath) => fs.readFileAsync(filePath, 'utf8')))
}

function createSummaryJson(parsedFiles) {
	const summaryJSON = parsedFiles.map(parsedFile => Object.assign({}, {data: parsedFile.data}));
	const fileName = generatedFilesDirectory + '/summary.json';
	writeObjectToFile(summaryJSON, fileName);
}

function generatePostsJSONDb(parsedFiles) {
	const output = {};
	parsedFiles.forEach(f => {
		output[f.data.url] = f;
	})
	const fileName = generatedFilesDirectory + '/posts.json';
	writeObjectToFile(output, fileName);
	
}

function generateIndividualPostJSON(parsedFiles) {
	parsedFiles.forEach(parsedFile => {
		const fileName = generatedFilesDirectory + parsedFile.data.url + '.json';
		const dataToWrite = Object.assign({}, {
			html: parsedFile.html,
			data: parsedFile.data
		});
		writeObjectToFile(dataToWrite, fileName);
	})
	
}

async function writeObjectToFile(object, file) {
	console.log('WRITING FILE', file);
	const str = JSON.stringify(object);
	ensureDirectoryExistence(file);
	await fs.writeFileAsync(file, str); 
}

function ensureDirectoryExistence(filePath) {
  var dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}
