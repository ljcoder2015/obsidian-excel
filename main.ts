import { App, Editor, MarkdownView, Modal, Notice, Plugin, PluginSettingTab, Setting, WorkspaceLeaf } from 'obsidian';

import { ExcelView, VIEW_TYPE_EXCEL } from './src/ExcelView';

export default class ExcelPlugin extends Plugin {

	async onload() {

		this.registerView(VIEW_TYPE_EXCEL, (leaf: WorkspaceLeaf) => new ExcelView(leaf, this));
		this.registerExtensions(["xlsx"], VIEW_TYPE_EXCEL);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon('table', 'Excel', (evt: MouseEvent) => {
			// Called when the user clicks the icon.
			new Notice('This is a notice!');
		});
		// Perform additional things with the ribbon
		ribbonIconEl.addClass('my-plugin-ribbon-class');

		// This adds a status bar item to the bottom of the app. Does not work on mobile apps.
		const statusBarItemEl = this.addStatusBarItem();
		statusBarItemEl.setText('Status Bar Text');


		// If the plugin hooks up any global DOM events (on parts of the app that doesn't belong to this plugin)
		// Using this function will automatically remove the event listener when this plugin is disabled.
		this.registerDomEvent(document, 'click', (evt: MouseEvent) => {
			console.log('click', evt);
		});

		// When registering intervals, this function will automatically clear the interval when the plugin is disabled.
		this.registerInterval(window.setInterval(() => console.log('setInterval'), 5 * 60 * 1000));
	}

	onunload() {

	}

	// async loadSettings() {
	// 	this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	// }

	// async saveSettings() {
	// 	await this.saveData(this.settings);
	// }
}
