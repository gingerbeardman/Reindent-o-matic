exports.activate = function() {
	console.log("Reindent-o-matic extension activated");
	nova.commands.register("com.gingerbeardman.editorconfig.indent.reapplyIndent", reapplyIndent);
	nova.commands.register("com.gingerbeardman.editorconfig.indent.reapplyIndentCurrentFile", reapplyIndentCurrentFile);
}

function getAllFiles(dir, extensions) {
	const fs = nova.fs;
	let results = [];
	const list = fs.listdir(dir);
	
	for (let file of list) {
		file = nova.path.join(dir, file);
		const stat = fs.stat(file);
		
		if (stat.isDirectory()) {
			results = results.concat(getAllFiles(file, extensions));
		} else if (extensions.some(ext => file.endsWith(ext))) {
			results.push(file);
		}
	}
	
	return results;
}

async function reapplyIndent() {
	console.log("Reapply indent command triggered");
	const workspace = nova.workspace;
	if (!workspace) {
		console.error("No active workspace found");
		nova.workspace.showErrorMessage("No active workspace found.");
		return;
	}

	const editorConfigPath = nova.path.join(workspace.path, '.editorconfig');
	console.log(`Looking for .editorconfig at: ${editorConfigPath}`);
	
	try {
		if (!nova.fs.access(editorConfigPath, nova.fs.F_OK)) {
			throw new Error(".editorconfig file not found in the project root");
		}

		console.log("Found .editorconfig file. Attempting to read...");
		let editorConfigContent = "";
		const file = nova.fs.open(editorConfigPath, "r");
		try {
			editorConfigContent = file.read();
		} finally {
			file.close();
		}
		console.log("EditorConfig content:", editorConfigContent);

		const indentStyle = getEditorConfigValue(editorConfigContent, 'indent_style');
		const indentSize = parseInt(getEditorConfigValue(editorConfigContent, 'indent_size'));
		console.log(`Indent style: ${indentStyle}, Indent size: ${indentSize}`);

		if (!indentStyle || !indentSize) {
			throw new Error("Invalid or missing indent settings in .editorconfig");
		}

		const extensions = nova.config.get('com.gingerbeardman.indent.extensionsToProcess') || [".lua",".md",".markdown"];
		console.log(`File extensions to process: ${extensions}`);

		console.log("Searching for files to process...");
		const files = getAllFiles(workspace.path, extensions);
		console.log(`Found ${files.length} files to process`);

		let processedFiles = 0;
		let changedFiles = 0;
		for (const file of files) {
			console.log(`Processing file: ${file}`);
			try {
				const editor = await nova.workspace.openFile(file);
				if (editor) {
					const text = editor.getTextInRange(new Range(0, editor.document.length));
					const lines = text.split('\n');
					const newLines = lines.map(line => reindentLine(line, indentStyle, indentSize));
					const newText = newLines.join('\n');
					
					if (text !== newText) {
						console.log(`Applying changes to file: ${file}`);
						editor.edit(edit => {
							edit.replace(new Range(0, editor.document.length), newText);
						});
						changedFiles++;
					}
					processedFiles++;
					// editor.save();
				} else {
					console.warn(`Could not open file: ${file}`);
				}
			} catch (fileError) {
				console.error(`Error processing file ${file}:`, fileError);
			}
		}

		console.log(`Processed ${processedFiles} out of ${files.length} files`);
		console.log(`${changedFiles} files were changed`);
		
		const showResults = nova.config.get('com.gingerbeardman.indent.showResults')
		
		if (showResults) {
			nova.workspace.showInformativeMessage(`${changedFiles} out of ${processedFiles} files were changed.\n\nPlease review and save these changes.`);
		}
	} catch (error) {
		console.error("Error in reapplyIndent:", error.message);
		// nova.workspace.showErrorMessage(error.message);
	}
}

async function reapplyIndentCurrentFile() {
	console.log("Reapply indent command triggered for current file");
	const editor = nova.workspace.activeTextEditor;
	if (!editor) {
		console.error("No active text editor found");
		nova.workspace.showErrorMessage("No active text editor found.");
		return;
	}

	const workspace = nova.workspace;
	if (!workspace) {
		console.error("No active workspace found");
		nova.workspace.showErrorMessage("No active workspace found.");
		return;
	}

	const editorConfigPath = nova.path.join(workspace.path, '.editorconfig');
	console.log(`Looking for .editorconfig at: ${editorConfigPath}`);
	
	try {
		if (!nova.fs.access(editorConfigPath, nova.fs.F_OK)) {
			throw new Error(".editorconfig file not found in the project root");
		}

		console.log("Found .editorconfig file. Attempting to read...");
		let editorConfigContent = "";
		const file = nova.fs.open(editorConfigPath, "r");
		try {
			editorConfigContent = file.read();
		} finally {
			file.close();
		}

		const indentStyle = getEditorConfigValue(editorConfigContent, 'indent_style');
		const indentSize = parseInt(getEditorConfigValue(editorConfigContent, 'indent_size'));
		console.log(`Indent style: ${indentStyle}, Indent size: ${indentSize}`);

		if (!indentStyle || !indentSize) {
			throw new Error("Invalid or missing indent settings in .editorconfig");
		}

		const text = editor.getTextInRange(new Range(0, editor.document.length));
		const lines = text.split('\n');
		const newLines = lines.map(line => reindentLine(line, indentStyle, indentSize));
		const newText = newLines.join('\n');
		
		if (text !== newText) {
			console.log(`Applying changes to current file`);
			editor.edit(edit => {
				edit.replace(new Range(0, editor.document.length), newText);
			});
			editor.save();
			console.log("Changes applied to current file");
			
			const showResults = nova.config.get('com.gingerbeardman.indent.showResults')
			if (showResults) {
				nova.workspace.showInformativeMessage("Indentation has been reapplied to the current file.\n\nPlease review and save these changes.");
			}
		} else {
			console.log("No changes needed for current file");
			if (nova.config.get('com.gingerbeardman.indent.showResults')) {
				nova.workspace.showInformativeMessage("No indentation changes were needed for the current file.");
			}
		}
	} catch (error) {
		console.error("Error in reapplyIndentCurrentFile:", error.message);
		// nova.workspace.showErrorMessage(error.message);
	}
}

function getEditorConfigValue(content, key) {
	const regex = new RegExp(`^${key}\\s*=\\s*(.+)$`, 'm');
	const match = content.match(regex);
	const value = match ? match[1].trim() : null;
	console.log(`EditorConfig value for ${key}: ${value}`);
	return value;
}

function reindentLine(line, indentStyle, indentSize) {
	const leadingWhitespace = line.match(/^(\s*)/)[0];
	const content = line.slice(leadingWhitespace.length);
	
	// Count the number of tabs and spaces in the leading whitespace
	const tabCount = (leadingWhitespace.match(/\t/g) || []).length;
	const spaceCount = (leadingWhitespace.match(/ /g) || []).length;
	
	// Calculate total spaces needed
	let totalSpaces;
	if (indentStyle === 'space') {
		// If converting to spaces, each tab becomes indentSize spaces
		totalSpaces = (tabCount * indentSize) + spaceCount;
	} else if (indentStyle === 'tab') {
		// If converting to tabs, calculate how many tabs and remaining spaces we need
		totalSpaces = spaceCount + (tabCount * indentSize);
	}
	
	// Create new indentation
	let newIndent = '';
	if (indentStyle === 'space') {
		// For spaces, simply repeat the space character
		newIndent = ' '.repeat(totalSpaces);
	} else if (indentStyle === 'tab') {
		// For tabs, calculate full tabs and remaining spaces
		const fullTabs = Math.floor(totalSpaces / indentSize);
		const remainingSpaces = totalSpaces % indentSize;
		newIndent = '\t'.repeat(fullTabs) + ' '.repeat(remainingSpaces);
	}
	
	return newIndent + content;
}