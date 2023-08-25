import {
  MarkdownPostProcessorContext,
  MetadataCache,
  TFile,
  Vault,
} from "obsidian";
import ExcelPlugin from "../main";
import { Excel } from "./Excel";

let plugin: ExcelPlugin;
let vault: Vault;
let metadataCache: MetadataCache;

const getDefaultWidth = (plugin: ExcelPlugin): string => {
  return "400";
};

export const initializeMarkdownPostProcessor = (p: ExcelPlugin) => {
  plugin = p;
  vault = p.app.vault;
  metadataCache = p.app.metadataCache;
};

/**
 *
 * @param el
 * @param ctx
 */
export const markdownPostProcessor = async (
  el: HTMLElement,
  ctx: MarkdownPostProcessorContext,
) => {

  console.log('markdownPostProcessor', el)
  //check to see if we are rendering in editing mode or live preview
  //if yes, then there should be no .internal-embed containers
  const embeddedItems = el.querySelectorAll(".internal-embed");
  if (embeddedItems.length === 0) {
    return;
  }

  await processReadingMode(embeddedItems, ctx);
};

const processReadingMode = async (
  embeddedItems: NodeListOf<Element> | [HTMLElement],
  ctx: MarkdownPostProcessorContext,
) => {
  //We are processing a non-excalidraw file in reading mode
  //Embedded files will be displayed in an .internal-embed container

  //Iterating all the containers in the file to check which one is an excalidraw drawing
  //This is a for loop instead of embeddedItems.forEach() because processInternalEmbed at the end
  //is awaited, otherwise excalidraw images would not display in the Kanban plugin
  embeddedItems.forEach(async (maybeDrawing, index) => {
    //check to see if the file in the src attribute exists
    console.log(maybeDrawing)
    const fname = maybeDrawing.getAttribute("src")?.split("#")[0];
    if(!fname) return true;

    const file = metadataCache.getFirstLinkpathDest(fname, ctx.sourcePath);
    console.log('forEach', file, ctx.sourcePath)

    //if the embeddedFile exits and it is an Excalidraw file
    //then lets replace the .internal-embed with the generated PNG or SVG image
    if (file && file instanceof TFile && plugin.isExcelFile(file)) {

      const data = await vault.read(file)
      const parent = maybeDrawing.parentElement
      if (data && parent) {
        const excel = new Excel(maybeDrawing.parentElement, data, index)
        ctx.addChild(excel)
      }
      
    }
  })
};
