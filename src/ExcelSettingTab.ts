import { App, PluginSettingTab, Setting } from "obsidian";
import ExcelPlugin from "./main";
import { t } from "./lang/helpers"

export class ExcelSettingTab extends PluginSettingTab {
	plugin: ExcelPlugin;

	constructor(app: App, plugin: ExcelPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

    display() {
        let { containerEl } = this

        containerEl.empty()

        containerEl.createEl("h1", { text: "File Setting / 文件设置" });

        new Setting(containerEl)
            .setName("Folder")
            .setDesc("Create files in this folder by default / 默认在此文件夹下创建文件")
            .addText((text) => 
                text
                    .setPlaceholder("/")
                    .setValue(this.plugin.settings.folder)
                    .onChange(async (value) => {
                        this.plugin.settings.folder = value
                        this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Filename Prefix / 文件名前缀")
            .setDesc("filename prefi / 设置文件名前缀")
            .addText((text) => 
                text
                    .setPlaceholder("Excel")
                    .setValue(this.plugin.settings.excelFilenamePrefix)
                    .onChange(async (value) => {
                        this.plugin.settings.excelFilenamePrefix = value
                        this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Filename Date Time/ 文件名时间格式")
            .setDesc("filename date time / 文件名时间格式")
            .addText((text) => 
                text
                    .setPlaceholder("YYYY-MM-DD HH.mm.ss")
                    .setValue(this.plugin.settings.excelFilenameDateTime)
                    .onChange(async (value) => {
                        this.plugin.settings.excelFilenameDateTime = value
                        this.plugin.saveSettings()
                    })
            )

        containerEl.createEl("h1", { text: "Embed Link Setting / 嵌入链接设置" });
                    
        new Setting(containerEl)
            .setName("Sheet Height/ 表格高度")
            .setDesc("default height for rendering spreadsheets / 渲染表格的默认高度")
            .addText((text) => 
                text
                    .setPlaceholder("300")
                    .setValue(this.plugin.settings.sheetHeight)
                    .onChange(async (value) => {
                        this.plugin.settings.sheetHeight = value
                        this.plugin.saveSettings()
                    })
            )

        containerEl.createEl("h1", { text: "Sheet Setting / 表格设置" });

        new Setting(containerEl)
            .setName("Row Height/ 行高度")
            .setDesc("default row height / 默认行高")
            .addText((text) => 
                text
                    .setPlaceholder("25")
                    .setValue(this.plugin.settings.rowHeight)
                    .onChange(async (value) => {
                        this.plugin.settings.rowHeight = value
                        this.plugin.saveSettings()
                    })
            )

        new Setting(containerEl)
            .setName("Column Width/ 列宽度")
            .setDesc("default column width / 默认列的宽度")
            .addText((text) => 
                text
                    .setPlaceholder("25")
                    .setValue(this.plugin.settings.colWidth)
                    .onChange(async (value) => {
                        this.plugin.settings.colWidth = value
                        this.plugin.saveSettings()
                    })
            )
    }
}
