import {
	TFile,
	Plugin,
	WorkspaceLeaf,
	normalizePath,
	ViewState,
	MarkdownView,
	Workspace,
	MenuItem,
	Menu,
} from "obsidian";
import { ExcelSettings, DEFAULT_SETTINGS } from "./utils/Settings";
import { PaneTarget } from "./utils/ModifierkeyHelper";
import { ExcelView } from "./ExcelView";
import { checkAndCreateFolder, getExcelFilename, getNewUniqueFilepath } from "./utils/FileUtils";
import { around, dedupe } from "monkey-around";
import { ExcelSettingTab } from "./ExcelSettingTab"

import { t } from "./lang/helpers"

import {
	initializeMarkdownPostProcessor,
	markdownPostProcessor,
} from "./MarkdownPostProcessor";
import { FRONTMATTER_KEY, FRONTMATTER, VIEW_TYPE_EXCEL } from "src/constants";

export default class ExcelPlugin extends Plugin {
	public settings: ExcelSettings;
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
		this.addRibbonIcon("table", t("CREATE_EXCEL"), (e: MouseEvent) => {
			// Called when the user clicks the icon.
			this.createAndOpenExcel(getExcelFilename(this.settings), undefined, this.getBlackData());
		});

		// markdwon后处理
		this.addMarkdownPostProcessor();

		//inspiration taken from kanban: https://github.com/mgmeyers/obsidian-kanban/blob/44118e25661bff9ebfe54f71ae33805dc88ffa53/src/main.ts#L267
		this.registerMonkeyPatches();

		this.switchToExcelAfterLoad();

		this.registerEventListeners();

		this.registerCommands()
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

	private registerCommands() {
		const fileMenuHandlerCreateNew = (menu: Menu, file: TFile) => {
			menu.addItem((item: MenuItem) => {
			  item
				.setTitle(t("CREATE_EXCEL"))
				.onClick((e) => {
				  let folderpath = file.path;
				  if (file instanceof TFile) {
					folderpath = normalizePath(
					  file.path.substr(0, file.path.lastIndexOf(file.name)),
					);
				  }
				  this.createAndOpenExcel(
					getExcelFilename(this.settings),
					folderpath,
				  );
				});
			});
		  };
	  
		  this.registerEvent(
			this.app.workspace.on("file-menu", fileMenuHandlerCreateNew),
		  );
	  
	}

	private registerMonkeyPatches() {
		const key =
			"https://github.com/ljcoder2015/obsidian-excel";
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

		const self = this;
		// Monkey patch WorkspaceLeaf to open Excalidraw drawings with ExcalidrawView by default
		this.register(
			around(WorkspaceLeaf.prototype, {
				// Drawings can be viewed as markdown or Excalidraw, and we keep track of the mode
				// while the file is open. When the file closes, we no longer need to keep track of it.
				detach(next) {
					return function () {
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
							state.state?.file
						) {
							// Then check for the excalidraw frontMatterKey
							const cache = this.app.metadataCache.getCache(
								state.state.file
							);

							// console.log("setViewState", cache)
							if (
								cache?.frontmatter &&
								cache?.frontmatter[FRONTMATTER_KEY]
							) {
								// console.log("setViewState --", cache)
								// If we have it, force the view type to excalidraw
								const newState = {
									...state,
									type: VIEW_TYPE_EXCEL,
								};

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
		const folderpath = normalizePath(
			foldername ? foldername : this.settings.folder,
		  );
		await checkAndCreateFolder(this.app.vault, folderpath)

		const fname = getNewUniqueFilepath(this.app.vault, filename, folderpath);
		const file = await this.app.vault.create(fname, initData ?? this.getBlackData());

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
		// console.log("isExcelFile", fileCache)
		return (
			!!fileCache?.frontmatter && !!fileCache?.frontmatter[FRONTMATTER_KEY]
		);
	}
}
