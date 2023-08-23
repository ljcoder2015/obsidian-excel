import { TFile, Plugin, WorkspaceLeaf, normalizePath } from "obsidian";
import { ExcelSettings, DEFAULT_SETTINGS } from "./src/utils/Settings";
import {
	emulateCTRLClickForLinks,
	linkClickModifierType,
	PaneTarget,
} from "./src/utils/ModifierkeyHelper";
import { ExcelView, VIEW_TYPE_EXCEL } from "./src/ExcelView";
import {
	checkAndCreateFolder,
	getNewUniqueFilepath,
	getExcelFilename,
} from "./src/utils/FileUtils";

import { getNewOrAdjacentLeaf } from "./src/utils/ObsidianUtils";

declare const PLUGIN_VERSION: string;

export default class ExcelPlugin extends Plugin {
	public settings: ExcelSettings;

	async onload() {
		this.registerView(
			VIEW_TYPE_EXCEL,
			(leaf: WorkspaceLeaf) => new ExcelView(leaf, this)
		);
		this.registerExtensions(["xlsx"], VIEW_TYPE_EXCEL);

		// This creates an icon in the left ribbon.
		const ribbonIconEl = this.addRibbonIcon(
			"table",
			"Excel",
			(e: MouseEvent) => {
				// Called when the user clicks the icon.
				this.createAndOpenExcel(
					getExcelFilename(this.settings)
				);
			}
		);
		// Perform additional things with the ribbon
		ribbonIconEl.addClass("my-plugin-ribbon-class");
	}

	onunload() {}

	async loadSettings() {
		this.settings = Object.assign(
			{},
			DEFAULT_SETTINGS,
			await this.loadData()
		);
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}

	public async createExcel(
		filename: string,
		foldername?: string,
		initData?: string
	): Promise<TFile> {
		// const folderpath = normalizePath(
		// 	foldername ? foldername : "Excel"
		// );
		// await checkAndCreateFolder(folderpath); //create folder if it does not exist
		const fname = normalizePath(filename);
		const file = await this.app.vault.create(fname, initData ?? "{}");

		return file;
	}

	public async createAndOpenExcel(
		filename: string,
		foldername?: string,
		initData?: string
	): Promise<string> {
		const file = await this.createExcel(filename, foldername, initData);
		this.openExcel(file, "new-pane", true, undefined);
		return file.path;
	}

	public openExcel(
		excelFile: TFile,
		location: PaneTarget,
		active: boolean = false,
		subpath?: string
	) {
		if (location === "md-properties") {
			location = "new-tab";
		}
		var leaf: WorkspaceLeaf | null = null;
		if (location === "popout-window") {
			leaf = app.workspace.openPopoutLeaf();
		}
		if (location === "new-tab") {
			leaf = app.workspace.getLeaf("tab");
		}
		if (!leaf) {
			leaf = this.app.workspace.getLeaf(false);
			if (
				leaf.view.getViewType() !== "empty" &&
				location === "new-pane"
			) {
				leaf = app.workspace.getMostRecentLeaf();
			}
		}

		leaf?.openFile(
			excelFile,
			!subpath || subpath === ""
				? { active }
				: { active, eState: { subpath } }
		).then(() => {});
	}

	public isExcelFile(f: TFile) {
		if (!f) return false;
		if (f.extension === "xlsx") {
			return true;
		}
		return false
	}
}
