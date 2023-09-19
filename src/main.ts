import {
	TFile,
	Plugin,
	WorkspaceLeaf,
	normalizePath,
	ViewState,
	MarkdownView,
	Workspace,
} from "obsidian";
import { ExcelSettings, DEFAULT_SETTINGS } from "./utils/Settings";
import { PaneTarget } from "./utils/ModifierkeyHelper";
import { ExcelView } from "./ExcelView";
import { getExcelFilename } from "./utils/FileUtils";
import { around, dedupe } from "monkey-around";
import { ExcelSettingTab } from "./ExcelSettingTab"

import {
	initializeMarkdownPostProcessor,
	markdownPostProcessor,
} from "./MarkdownPostProcessor";
import { FRONTMATTER_KEY, FRONTMATTER, VIEW_TYPE_EXCEL } from "src/constants";

export default class ExcelPlugin extends Plugin {
	public settings: ExcelSettings;
	public excelFileModes: { [file: string]: string } = {};
	private _loaded: boolean = false;

	async onload() {
		// 加载设置
		await this.loadSettings()

		this.addSettingTab(new ExcelSettingTab(this.app, this))

		this.registerView(
			VIEW_TYPE_EXCEL,
			(leaf: WorkspaceLeaf) => new ExcelView(leaf, this)
		);
		this.registerExtensions(["sheet"], VIEW_TYPE_EXCEL);

		// This creates an icon in the left ribbon.
		this.addRibbonIcon("table", "Excel", (e: MouseEvent) => {
			// Called when the user clicks the icon.
			this.createAndOpenExcel(getExcelFilename(this.settings), undefined, this.getBlackData());
		});

		// markdwon后处理
		this.addMarkdownPostProcessor();

		//inspiration taken from kanban: https://github.com/mgmeyers/obsidian-kanban/blob/44118e25661bff9ebfe54f71ae33805dc88ffa53/src/main.ts#L267
		this.registerMonkeyPatches();

		this.switchToExcelAfterLoad();

		this.registerEventListeners();
	}

	onunload() {}

	private getBlackData() {
		return FRONTMATTER + "\n# Excel\n";
	}

	private addMarkdownPostProcessor() {
		initializeMarkdownPostProcessor(this);
		this.registerMarkdownPostProcessor(markdownPostProcessor);
	}

	private registerEventListeners() {
		// const self = this;
		// //save Excalidraw leaf and update embeds when switching to another leaf
		// const activeLeafChangeEventHandler = async (leaf: WorkspaceLeaf) => {
		// 	console.log('activeLeafChangeEventHandler', leaf)
		// 	// this.switchToExcelAfterLoad()
		// };
		// self.registerEvent(
		// 	this.app.workspace.on(
		// 		"active-leaf-change",
		// 		activeLeafChangeEventHandler
		// 	)
		// );
	}

	private switchToExcelAfterLoad() {
		const self = this;
		this.app.workspace.onLayoutReady(() => {
			let leaf: WorkspaceLeaf;
			let markdownLeaf = this.app.workspace.getLeavesOfType("markdown")
			// console.log("switchToExcelAfterLoad", markdownLeaf);
			for (leaf of markdownLeaf) {
				if (
					leaf.view instanceof MarkdownView &&
					leaf.view.file &&
					self.isExcelFile(leaf.view.file)
				) {
					self.excelFileModes[
						(leaf as any).id || leaf.view.file?.path
					] = VIEW_TYPE_EXCEL;
					self.setExcelView(leaf);
				}
			}
		});
	}

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

	private registerMonkeyPatches() {
		const key =
			"https://github.com/zsviczian/obsidian-excalidraw-plugin/issues";
		this.register(
			around(Workspace.prototype, {
				getActiveViewOfType(old) {
					// console.log("Workspace.prototype", old);
					return dedupe(key, old, function (...args) {
						const result = old && old.apply(this, args);
						const maybeSheetView =
							this.app?.workspace?.activeLeaf?.view;
						if (
							!maybeSheetView ||
							!(maybeSheetView instanceof ExcelView)
						)
							return result;
					});
				},
			})
		);
		//@ts-ignore
		if (!this.app.plugins?.plugins?.["obsidian-hover-editor"]) {
			this.register(
				//stolen from hover editor
				around(WorkspaceLeaf.prototype, {
					getRoot(old) {
						// console.log("stolen from hover editor");
						return function () {
							const top = old.call(this);
							return top.getRoot === this.getRoot
								? top
								: top.getRoot();
						};
					},
				})
			);
		}
		this.registerEvent(
			this.app.workspace.on("editor-menu", (menu, editor, view) => {
				if (!view || !(view instanceof MarkdownView)) return;
				const file = view.file;
				const leaf = view.leaf;
				if (!file) return;
				const cache = this.app.metadataCache.getFileCache(file);
				if (!cache?.frontmatter || !cache.frontmatter[FRONTMATTER_KEY])
					return;

				menu.addItem((item) =>
					item
						.setTitle("OPEN_AS_EXCEL")
						.setIcon("grid")
						.setSection("excel")
						.onClick(() => {
							//@ts-ignore
							this.excelFileModes[leaf.id || file.path] =
								VIEW_TYPE_EXCEL;
							this.setExcelView(leaf);
						})
				);
			})
		);

		this.registerEvent(
			this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
				if (!leaf || !(leaf.view instanceof MarkdownView)) return;
				if (!(file instanceof TFile)) return;
				const cache = this.app.metadataCache.getFileCache(file);
				if (!cache?.frontmatter || !cache.frontmatter[FRONTMATTER_KEY])
					return;

				menu.addItem((item) => {
					item.setTitle("OPEN_AS_EXCEL")
						.setIcon("grid")
						.setSection("pane")
						.onClick(() => {
							//@ts-ignore
							this.excelFileModes[leaf.id || file.path] =
								VIEW_TYPE_EXCEL;
							this.setExcelView(leaf);
						});
				});
				//@ts-ignore
				menu.items.unshift(menu.items.pop());
			})
		);

		const self = this;
		// Monkey patch WorkspaceLeaf to open Excalidraw drawings with ExcalidrawView by default
		this.register(
			around(WorkspaceLeaf.prototype, {
				// Drawings can be viewed as markdown or Excalidraw, and we keep track of the mode
				// while the file is open. When the file closes, we no longer need to keep track of it.
				detach(next) {
					return function () {
						const state = this.view?.getState();
						// console.log('state--', state.file)
						if (
							state?.file &&
							self.excelFileModes[this.id || state.file]
						) {
							delete self.excelFileModes[this.id || state.file];
						}

						return next.apply(this);
					};
				},

				setViewState(next) {
					return function (state: ViewState, ...rest: any[]) {
						if (
							// Don't force excalidraw mode during shutdown
							self._loaded &&
							// If we have a markdown file
							state.type === "markdown" &&
							state.state?.file &&
							// And the current mode of the file is not set to markdown
							self.excelFileModes[this.id || state.state.file] !==
								"markdown"
						) {
							// Then check for the excalidraw frontMatterKey
							const cache = app.metadataCache.getCache(
								state.state.file
							);

							if (
								cache?.frontmatter &&
								cache.frontmatter[FRONTMATTER_KEY]
							) {
								// If we have it, force the view type to excalidraw
								const newState = {
									...state,
									type: VIEW_TYPE_EXCEL,
								};

								self.excelFileModes[state.state.file] =
									VIEW_TYPE_EXCEL;

								return next.apply(this, [newState, ...rest]);
							}
						}

						return next.apply(this, [state, ...rest]);
					};
				},
			})
		);
	}

	public async setExcelView(leaf: WorkspaceLeaf) {
		await leaf.setViewState({
			type: VIEW_TYPE_EXCEL,
			state: leaf.view.getState(),
			popstate: true,
		} as ViewState);
	}

	public async createExcel(
		filename: string,
		foldername?: string,
		initData?: string
	): Promise<TFile> {

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
		active = false,
		subpath?: string
	) {
		if (location === "md-properties") {
			location = "new-tab";
		}
		var leaf: WorkspaceLeaf | null = null;
		if (location === "popout-window") {
			leaf = this.app.workspace.openPopoutLeaf();
		}
		if (location === "new-tab") {
			leaf = this.app.workspace.getLeaf("tab");
		}
		if (!leaf) {
			leaf = this.app.workspace.getLeaf(false);
			if (
				leaf.view.getViewType() !== "empty" &&
				location === "new-pane"
			) {
				leaf = this.app.workspace.getMostRecentLeaf();
			}
		}

		leaf?.openFile(
			excelFile,
			!subpath || subpath === ""
				? { active, state: { type: VIEW_TYPE_EXCEL } }
				: { active, eState: { subpath }, state: { type: VIEW_TYPE_EXCEL } }
		).then(() => {
			if (leaf) {
				this.setExcelView(leaf)
			}
		});
	}

	public isExcelFile(f: TFile) {
		if (!f) return false;
		if (f.extension === "sheet") {
			return true;
		}
		const fileCache = f ? this.app.metadataCache.getFileCache(f) : null;
		return (
			!!fileCache?.frontmatter && !!fileCache.frontmatter[FRONTMATTER_KEY]
		);
	}
}
