import ExcelPlugin from "src/main";
import { TextFileView, WorkspaceLeaf, Platform, Notice, moment, TFile } from "obsidian";
import Spreadsheet from "x-data-spreadsheet";
import * as XLSX from "xlsx";
import { stox, xtos } from "./utils/xlsxspread";
import { VIEW_TYPE_EXCEL, FRONTMATTER } from "./constants";
import { getExcelData } from "./utils/DataUtils";
import zhCn from "./lang/locale/sheet-zh-cn"
import en from "./lang/locale/sheet-en"
import { t } from "./lang/helpers"
import { updateSheetTheme } from "./utils/ThemeUtils";

export class ExcelView extends TextFileView {
	public plugin: ExcelPlugin;
	public ownerWindow: Window;
	public sheet: Spreadsheet;
	public importEle: HTMLElement;
	public exportEle: HTMLElement;
	public embedLinkEle: HTMLElement;
	public copyHTMLEle: HTMLElement;
	public sheetEle: HTMLElement;
	public cellsSelected: {
		sheet: Record<string, any> | null;
		sri: number | null; // 选中开始行 index
		sci: number | null; // 选中开始列 index
		eri: number | null; // 选中结束行 index
		eci: number | null; // 选中结束列 index
	} = {
		sheet: null,
		sri: null,
		sci: null,
		eri: null,
		eci: null,
	};

	constructor(leaf: WorkspaceLeaf, plugin: ExcelPlugin) {
		super(leaf);
		this.plugin = plugin;
	}

	getViewData(): string {
		return this.data;
	}

	headerData() {
		return FRONTMATTER + "\n# Excel\n";
	}

	saveData(data: string) {
		this.data = this.headerData() + data;
		// console.log("saveData", this.data)
		this.save(false)
			.then(() => {
				console.log("save data success", this.file)
			})
			.catch((e) => {
				console.log("save data error", e)
			})
	}

	clear(): void {
		this.data = this.headerData();
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;

		this.app.workspace.onLayoutReady(async () => {
			// console.log('setViewData', this.file)
			this.refresh();
		});
	}

	// 处理顶部导入按钮点击事件
	handleImportClick(ev: MouseEvent) {
		const importEle = document.getElementById("import");
		importEle?.click();
	}

	handleFile(e: Event) {
		//@ts-ignore
		const files = e.target?.files;
		if (!files) {
			new Notice(t("GET_FILE_FAILED"));
			return;
		}
		const f = files[0];
		const reader = new FileReader();
		const self = this
		reader.onload = (e) => {
			const data = e.target?.result;
			console.log('handleFile', self.file)
			if (data) {
				self.process_wb(XLSX.read(data));
			} else {
				new Notice(t("READ_FILE_FAILED"));
			}
		};
		reader.readAsArrayBuffer(f);
	}

	process_wb(wb: XLSX.WorkBook) {
		const sheetData = stox(wb);
		if (sheetData) {
			this.sheet.loadData(sheetData)
			this.saveData(JSON.stringify(sheetData))
		} else {
			new Notice(t("DATA_PARSING_ERROR"));
		}
	}

	handleExportClick(ev: MouseEvent) {
		//@ts-ignore
		const new_wb = xtos(this.sheet.getData()) as XLSX.WorkBook;
		const title = this.file?.basename ?? "sheet";
		/* write file and trigger a download */
		XLSX.writeFile(new_wb, title + ".xlsx", {});
	}

	handleEmbedLink(e: Event) {
		const data = this.cellsSelected.sheet;
		const sri = this.cellsSelected.sri;
		const sci = this.cellsSelected.sci;
		const eri = this.cellsSelected.eri;
		const eci = this.cellsSelected.eci;

		// 格式 sri-sci:eri-eci
		if (this.file && data) {
			const link = `![[${this.file.basename}#${data.name}|${sri}-${sci}:${eri}-${eci}]]`;
			// console.log(this.file, link);
			navigator.clipboard.writeText(link);
			new Notice(t("COPY_EMBED_LINK_SUCCESS"));
		} else {
			new Notice(t("COPY_EMBED_LINK_FAILED"));
		}
	}

	onload(): void {
		this.ownerWindow = this.containerEl.win;
		console.log("onload", this.file)

		// 添加顶部导入按钮
		this.importEle = this.addAction("download", t("IMPORT_XLSX_FILE"), (ev) =>
			this.handleImportClick(ev)
		);

		this.exportEle = this.addAction("upload", t("EXPORT_XLSX_FILE"), (ev) =>
			this.handleExportClick(ev)
		);

		this.embedLinkEle = this.addAction("link", t("COPY_EMBED_LINK"), (ev) =>
			this.handleEmbedLink(ev)
		);

		this.copyHTMLEle = this.addAction("file-code", t("COPY_TO_HTML"), (ev) =>
			this.copyToHTML()
		);

		super.onload();
	}

	getViewType(): string {
		return VIEW_TYPE_EXCEL;
	}

	refresh() {
		this.contentEl.empty();
		this.sheetEle = this.contentEl.createDiv({
			attr: {
				id: "x-spreadsheet",
				class: "sheet-box",
			},
		});

		// 添加隐藏的导入input，用来选择导入的文件
		const importInput = this.contentEl.createEl("input", {
			cls: "import-excel",
			type: "file",
			attr: {
				id: "import",
				accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			},
		});
		importInput.addEventListener(
			"change",
			this.handleFile.bind(this),
			false
		);

		// 初始化 sheet
		const jsonData = JSON.parse(getExcelData(this.data) || "{}") || {};
		// console.log("refresh", jsonData, this.file)

		// 设置多语言
		if (moment.locale() === 'zh-cn') {
			Spreadsheet.locale('zh-cn', zhCn)
		} else {
			Spreadsheet.locale('en', en)
		}

		// 设置 sheet 样式
		var style = {
			bgcolor: '#ffffff',
			align: 'left',
			valign: 'middle',
			textwrap: false,
			strike: false,
			underline: false,
			color: '#0a0a0a',
			font: {
			  name: 'Helvetica',
			  size: 10,
			  bold: false,
			  italic: false,
			},
		}

		if (this.plugin.settings.theme === "dark") {
			style = {
				bgcolor: '#363636',
				align: 'left',
				valign: 'middle',
				textwrap: false,
				strike: false,
				underline: false,
				color: '#e6e6e6',
				font: {
				  name: 'Helvetica',
				  size: 10,
				  bold: false,
				  italic: false,
				},
			}
		}
		
		//@ts-ignore
		this.sheet = new Spreadsheet(this.sheetEle, {
			showBottomBar: true,
			view: {
				height: () => this.contentEl.clientHeight,
				width: () => this.contentEl.clientWidth - 32,
			},
			row: {
				len: 100,
				height: parseInt(this.plugin.settings.rowHeight),
			},
			col: {
				len: 26,
				width: parseInt(this.plugin.settings.colWidth),
				indexWidth: 60,
				minWidth: 60,
			},
			//@ts-ignore
			style: style,
			isDark: this.plugin.settings.theme === "dark"
		})
			.loadData(jsonData) // load data
			.change(() => {
				// save data to db
				const data = this.sheet.getData();
				this.saveData(JSON.stringify(data));
			})
			.onAddSheet(() => {
				const data = this.sheet.getData();
				// console.log('onAddSheet', data)
				this.saveData(JSON.stringify(data));
			})
			.onRenameSheet(() => {
				const data = this.sheet.getData();
				// console.log('onRenameSheet', data)
				this.saveData(JSON.stringify(data));
			})
			.onDeleteSheet(() => {
				const data = this.sheet.getData();
				// console.log('onDeleteSheet', data)
				this.saveData(JSON.stringify(data));
			});

		this.sheet.on("cells-selected", (sheetData, { sri, sci, eri, eci }) => {
			// console.log('cells-selected',sheetData, sri, sci, eri, eci)
			this.cellsSelected.sheet = sheetData;
			this.cellsSelected.sri = sri;
			this.cellsSelected.sci = sci;
			this.cellsSelected.eri = eri;
			this.cellsSelected.eci = eci;
		});

		this.sheet.on("cell-selected", (sheetData, ri, ci) => {
			// console.log('cell-selected',sheetData, ri, ci)
			this.cellsSelected.sheet = sheetData;
			this.cellsSelected.sri = ri;
			this.cellsSelected.sci = ci;
			this.cellsSelected.eri = ri;
			this.cellsSelected.eci = ci;
		});

		updateSheetTheme(this.plugin.settings.theme === "dark")

		// @ts-ignore
		this.sheet.validate();
	}

	copyToHTML() {
		const data = this.cellsSelected.sheet;
		const sri = this.cellsSelected.sri || 0;
		const sci = this.cellsSelected.sci || 0;
		const eri = this.cellsSelected.eri || 0;
		const eci = this.cellsSelected.eci || 0;

		console.log('data', data, sri, sci, eri, eci)

		var html = "<table>";

		if (data) {
			// 记录合并单元格数量
			var mergeMap: Map<string, boolean> = new Map()

			for (var row = sri; row <= eri; row++) {
				html += "<tr>";
				
				for (var col = sci; col <= eci; col++) {
					
					// 获取当前行的数据
					const cells = data.rows._[`${row}`];
					if (cells) {
						// 如果当前行有数据
						// 获取单元格数据
						const cell = cells.cells[`${col}`];
						if (cell) {
							// 如果单元格有数据展示数据
							if (cell.merge) {
								// 是否有合并单元格的操作
								var mergeRow = cell.merge[0] + 1
								var mergeCol = cell.merge[1] + 1

								// 记录合并的行跟列
								for(var r = 0; r < mergeRow; r ++) {
									const index = `${row + r}-${col}`
									mergeMap.set(index, true)

									for(var c = 0; c < mergeCol; c ++) {
										const index = `${row + r}-${col + c}`
										mergeMap.set(index, true)
									}
								}

								html += `<td rowspan="${mergeRow}" colspan="${mergeCol}">${cell.text || ""}</td>`;
							} else {
								// 无合并单元格直接添加
								html += `<td>${cell.text || ""}</td>`;
							}
						} else {
							// 添加空白单元格需要判断是否被合并了
							const index = `${row}-${col}`
							if (!mergeMap.get(index)) {
								// 单元格没数据添加空白单元格 & 没有被合并单元格
								html += `<td></td>`;	
							}
						}
					} else {
						const index = `${row}-${col}`
						// 添加空白单元格需要判断是否被合并了
						if (!mergeMap.get(index)) {
								// 单元格没数据添加空白单元格 & 没有被合并单元格
							html += `<td></td>`;
						}
					}
				}

				html += "</tr>";
			}
		} else {
			new Notice(t("PLEASE_SELECT_DATA"));
		}

		html += "</table>";

		navigator.clipboard.writeText(html);
		new Notice(t("COPY_TO_HTML_SUCCESS"));
	}

	onResize() {
		if (Platform.isDesktopApp) {
			this.refresh();
		}
		// console.log('resize')
		super.onResize();
	}
}
