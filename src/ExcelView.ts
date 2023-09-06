import ExcelPlugin from "src/main";
import { TextFileView, WorkspaceLeaf, Platform, Notice } from "obsidian";
import Spreadsheet from "x-data-spreadsheet";
import * as XLSX from "xlsx";
import { stox, xtos } from "./utils/xlsxspread";
import { VIEW_TYPE_EXCEL, FRONTMATTER } from "./constants";

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

	getExcelData(): string {
		const tagText = "# Excel\n";
		const trimLocation = this.data.search(tagText);
		if (trimLocation == -1) return this.data;
		const excelData = this.data.substring(
			trimLocation + tagText.length,
			this.data.length
		);
		// console.log("trimLocation", trimLocation, excelData, this.data);
		return excelData;
	}

	headerData() {
		return FRONTMATTER + "\n# Excel\n";
	}

	saveData(data: string) {
		this.data = this.headerData() + data;
		// console.log("saveData", this.data)
	}

	clear(): void {
		this.data = this.headerData();
	}

	setViewData(data: string, clear: boolean): void {
		this.data = data;

		app.workspace.onLayoutReady(async () => {
			// console.log('setViewData')
			await this.refresh();
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
			new Notice("Failed to get file");
			return;
		}
		const f = files[0];
		const reader = new FileReader();
		reader.onload = (e) => {
			const data = e.target?.result;

			if (data) {
				this.process_wb(XLSX.read(data));
			} else {
				new Notice("Read file error");
			}
		};
		reader.readAsArrayBuffer(f);
	}

	process_wb(wb: XLSX.WorkBook) {
		const sheetData = stox(wb);
		if (sheetData) {
			this.sheet.loadData(sheetData);
			this.data = JSON.stringify(sheetData);
		} else {
			new Notice("Data parsing error");
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
		if (this.file) {
			navigator.clipboard.writeText(`![[${this.file.path}]]`);
			new Notice("Copy embed link to clipboard");
		} else {
			new Notice("Copy embed link failed");
		}
	}

	onload(): void {
		this.ownerWindow = this.containerEl.win;

		// 添加顶部导入按钮
		this.importEle = this.addAction("download", "import xlsx file", (ev) =>
			this.handleImportClick(ev)
		);

		this.exportEle = this.addAction("upload", "export xlsx file", (ev) =>
			this.handleExportClick(ev)
		);

		this.embedLinkEle = this.addAction("link", "copy embed link", (ev) =>
			this.handleEmbedLink(ev)
		);

		this.copyHTMLEle = this.addAction("file-code", "copy to HTML", (ev) =>
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
		const jsonData = JSON.parse(this.getExcelData() || "{}") || {};

		//@ts-ignore
		this.sheet = new Spreadsheet(this.sheetEle, {
			showBottomBar: true,
			view: {
				height: () => this.contentEl.clientHeight,
				width: () => this.contentEl.clientWidth,
			},
		})
			.loadData(jsonData) // load data
			.change(() => {
				// save data to db
				const data = this.sheet.getData();
				// console.log("save data to db", data);
				this.saveData(JSON.stringify(data))
			})
			.onAddSheet(() => {
				const data = this.sheet.getData();
				// console.log('onAddSheet', data)
				this.saveData(JSON.stringify(data))
			})
			.onRenameSheet(() => {
				const data = this.sheet.getData();
				// console.log('onRenameSheet', data)
				this.saveData(JSON.stringify(data))
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

		// @ts-ignore
		this.sheet.validate();
	}

	copyToHTML() {
		const data = this.cellsSelected.sheet;
		const sri = this.cellsSelected.sri;
		const sci = this.cellsSelected.sci;
		const eri = this.cellsSelected.eri;
		const eci = this.cellsSelected.eci;

		// console.log('data', data, sri, sci, eri, eci)

		var html = "<table>";

		if (data && sri && sci && eri && eci) {
			for (var row = sri; row <= eri; row++) {
				html += "<tr>";
				const cells = data.rows._[`${row}`];
				// console.log('cells', row, cells.cells)
				if (cells) {
					for (var col = sci; col <= eci; col++) {
						const cell = cells.cells[`${col}`];
						// console.log('cell', row, col, cell)
						if (cell) {
							if (cell.merge) {
								html += `<td rowspan="${cell.merge[0]}" colspan="${cell.merge[1]}">${cell.text}</td>`;
							} else {
								html += `<td>${cell.text}</td>`;
							}
						}
					}
				}

				html += "</tr>";
			}
		} else {
			new Notice("Please first select the data to copy");
		}

		html += "</table>";

		navigator.clipboard.writeText(html);
		new Notice("copied");
	}

	onResize() {
		if (Platform.isDesktopApp) {
			this.refresh();
		}
		// console.log('resize')
		super.onResize();
	}
}
