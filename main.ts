import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface DisplayAliasWithFileTitleSettings {
	aliasPositionedAboveFileName: boolean;
	onlyShowFirstAlias: boolean;
}

const DEFAULT_SETTINGS: DisplayAliasWithFileTitleSettings = {
	aliasPositionedAboveFileName: false,
	onlyShowFirstAlias: true
}

export default class DisplayAliasWithFileTitlePlugin extends Plugin {

	settings: DisplayAliasWithFileTitleSettings;
	self = null;

	public displayAliases() {

		// get the File Explorer object
		const fileExplorer = app.workspace.getLeavesOfType('file-explorer')[0];
		
		// TODO: add the same functionality to search results
		//const search = app.workspace.getLeavesOfType('search')[0];

		// get a list of all files and folders
		let files = fileExplorer.view.fileItems;

		for (const file of Object.values(files)) {

			// check to make sure the object has a property called "aliases"
			// this will ensure, for example, that folders, or files without aliases, do not get processed
			if (app.metadataCache.getFileCache(file.file)?.frontmatter?.aliases) {

				// get the DOM object containing the title (this will be used later)
				const titleDiv = file.selfEl.querySelector('.tree-item-inner');
				
				// create the string variable with the aliases associated with a file (this will be used later)
				let aliases = app.metadataCache.getFileCache(file.file)?.frontmatter?.aliases;

				if (self.settings.onlyShowFirstAlias && Array.isArray(aliases) && aliases.length > 0) {
					aliases = aliases[0];	// strip the array of all elements except the first item
				}
				
				// if there is an existing DOM item displaying the alias, remove it
				const aliasDiv = file.selfEl.querySelector('.file-alias');
				if ( aliasDiv ) {
					aliasDiv.remove();
				}

				// create a new DOM object (a div) containing the alias
				// add the class `file-alias` so it can be identified as an alias
				const newChild = file.selfEl.createEl('div', {text: aliases, cls: 'file-alias nav-file-title-content'});

				if (self.settings.aliasPositionedAboveFileName) {
					file.selfEl.prepend(newChild);			// move the alias above the title
					titleDiv.classList.add("sub-text");		// make the title small
				} else {
					titleDiv.classList.remove("sub-text");	// make the title big
					newChild.classList.add("sub-text");		// make the alias small
				}

				// if the title does not have an alias, remove the `sub-text` class
				// this block will get executed when a file had an alias, but the alias was removed
				if (aliases.length <= 0) {
					titleDiv.classList.remove("sub-text");
				}

			}
		}
	}

	public async onload() {
		// since in JavaScript, `this` can't be used in a callback function, initialize `self` so it can access
		// member variables from within the `displayAliases` method
		self = this;
		
		await this.loadSettings();

		// adds the settings tab so the user can configure various aspects of the plugin
		this.addSettingTab(new DisplayAliasWithFileTitleSettingTab(this.app, this));

		// call displayAliases on first use
		this.app.workspace.onLayoutReady(this.displayAliases);

		// configure `displayAliases` to be each time a file's metadata is changed
		this.registerEvent(this.app.metadataCache.on("changed", this.displayAliases));
	}

	public onunload() {
	}

	public async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	public async saveSettings() {
		await this.saveData(this.settings);
		this.displayAliases();
	}
}

class DisplayAliasWithFileTitleSettingTab extends PluginSettingTab {
	plugin: DisplayAliasWithFileTitlePlugin;

	constructor(app: App, plugin: DisplayAliasWithFileTitlePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Alias Position')
			.setDesc('Show aliases above file name.')
			.addToggle(boolean => boolean
				.setValue(this.plugin.settings.aliasPositionedAboveFileName)
				.onChange(async (value) => {
					this.plugin.settings.aliasPositionedAboveFileName = value;
					await this.plugin.saveSettings();
				})
			);
		
		new Setting(containerEl)
			.setName('Alias Arrays')
			.setDesc('If a file has multiple aliases, only include the first alias.')
			.addToggle(boolean => boolean
				.setValue(this.plugin.settings.onlyShowFirstAlias)
				.onChange(async (value) => {
					this.plugin.settings.onlyShowFirstAlias = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
