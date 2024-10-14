**Reindent-o-matic** allows you to apply .editorconfig indent rules to your files!

It can be run on the current file, or every file in your project matching specified file extensions.

> Important: changes are applied but not saved, giving you the opportunity to review.

## Usage

To run Reindent-o-matic:

- Select the **Editor → Reindent-o-matic**
- Open the command palette and type `Indent` 

You might also choose to set a keyboard shortcut using **Nova → Settings... → Key Bindings**, such as:

- `Cmd`+`Shift`+`R` to invoke **Apply .editorconfig indentation to current file**
- `Cmd`+`Shift`+`Option`+`R` to invoke **Apply .editorconfig indentation to all matching files**

## Results

1. Spaces to Tabs

	If your .editorconfig is set to:

	```
	indent_style = space
	indent_size = 2
	```

	After running:
	
	- any line starting with tabs will have each tab replaced with 2 spaces.

2. Tabs to Spaces

	If your .editorconfig is set to:

	```
	indent_style = tab
	indent_size = 4
	```

	After running:
	
	- any line starting with spaces will have groups of 4 spaces replaces with single tabs.

	> Important: partial intending is ignored, so if there is a line with an indent of 3 spaces _it will not be converted to a tab_.

## Configuration

To configure global preferences, open **Extensions → Extension Library...** then select Reindent-o-matic's **Settings** tab.

You can customise the following:

- Show Results Confirmation
	- default: `true`
- File Extensions to Process (comma-separated)
	- default: `.lua,.md,.markdown`
