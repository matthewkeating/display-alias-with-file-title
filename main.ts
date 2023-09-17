import { App, Plugin, PluginSettingTab, Setting } from 'obsidian';

interface DisplayAliasWithFileTitleSettings {
	hideFileTitle: boolean;
	aliasOnTop: boolean;
	firstAliasOnly: boolean;
}

const DEFAULT_SETTINGS: DisplayAliasWithFileTitleSettings = {
	hideFileTitle: false,
	aliasOnTop: true,
	firstAliasOnly: true
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
			// files that have the aliases property with no values will still enter this loop (this is intentional)
			if (app.metadataCache.getFileCache(file.file)?.frontmatter?.aliases) {

				// create the string variable with the aliases associated with a file
				let aliases = app.metadataCache.getFileCache(file.file)?.frontmatter?.aliases;

				// get the DOM object containing the title
				const titleDiv = file.selfEl.querySelector('.tree-item-inner');

				// if there are no aliases, remove the `sub-text` class
				// this block will get executed immediately after the last alias was removed
				if (aliases.length <= 0) {
					titleDiv.classList.remove("sub-text");
					titleDiv.classList.remove("hidden");
					if (file.selfEl.querySelector('.file-alias')) {
						file.selfEl.querySelector('.file-alias').remove();
					}
					continue;
				}

				if (self.settings.firstAliasOnly && Array.isArray(aliases) && aliases.length > 0) {
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

				if (self.settings.aliasOnTop) {
					file.selfEl.prepend(newChild);			// move the alias above the title
					titleDiv.classList.add("sub-text");		// make the title small
				} else {
					titleDiv.classList.remove("sub-text");	// make the title big
					newChild.classList.add("sub-text");		// make the alias small
				}

				if (self.settings.hideFileTitle) {
					titleDiv.classList.add("hidden");
				} else {
					titleDiv.classList.remove("hidden");
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

	private hideFileTitlesSetting: Setting;
	private aliasOnTopSetting: Setting;
	private firstAliasOnlySetting: Setting;

	constructor(app: App, plugin: DisplayAliasWithFileTitlePlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		this.hideFileTitlesSetting = new Setting(containerEl)
			.setName('Hide File Titles')
			.setDesc('For any file that has an alias, hide the file title.')
			.addToggle(boolean => boolean
				.setValue(this.plugin.settings.hideFileTitle)
				.onChange(async (value) => {
					this.plugin.settings.hideFileTitle = value;
					if (value) {
						this.plugin.settings.aliasOnTop = true;		// if the file title is hidden, the alias is, by definition, on top
						this.aliasOnTopSetting.setDisabled(true);
					}
					await this.plugin.saveSettings();
					this.display();
				})
			);

		
		this.aliasOnTopSetting = new Setting(containerEl)
			.setName('Alias On Top')
			.setDesc('Show aliases above file title (note: this will be true if file titles are being hidden).')
			.addToggle(boolean => boolean
				.setValue(this.plugin.settings.aliasOnTop)
				.onChange(async (value) => {
					this.plugin.settings.aliasOnTop = value;
					await this.plugin.saveSettings();
				})
			);
	
		// the option to put the alias on top of the title does not make sense if the title is hidden
		// the statement below will disable the 'Alias on Top' option if 'Hide File Titles' is true
		if (this.plugin.settings.hideFileTitle){
			this.aliasOnTopSetting.setDisabled(true);
		}
		
		this.firstAliasOnlySetting = new Setting(containerEl)
			.setName('First Alias Only')
			.setDesc('If a file has multiple aliases, only include the first alias.')
			.addToggle(boolean => boolean
				.setValue(this.plugin.settings.firstAliasOnly)
				.onChange(async (value) => {
					this.plugin.settings.firstAliasOnly = value;
					await this.plugin.saveSettings();
				})
			);
	}
}
