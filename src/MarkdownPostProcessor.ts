import {
  MarkdownPostProcessorContext,
  MetadataCache,
  TFile,
  Vault,
} from "obsidian";
import ExcelPlugin from "../main";
import {getIMGFilename,} from "./utils/FileUtils";
import { linkClickModifierType } from "./utils/ModifierkeyHelper";

interface imgElementAttributes {
  file?: TFile;
  fname: string; //Excalidraw filename
  fwidth: string; //Display width of image
  fheight: string; //Display height of image
  style: string; //css style to apply to IMG element
}

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

  console.log(metadataCache)
  //check to see if we are rendering in editing mode or live preview
  //if yes, then there should be no .internal-embed containers
  const embeddedItems = el.querySelectorAll(".internal-embed");
  if (embeddedItems.length === 0) {
    // tmpObsidianWYSIWYG(el, ctx);
    return;
  }

  //If the file being processed is an excalidraw file,
  //then I want to hide all embedded items as these will be
  //transcluded text element or some other transcluded content inside the Excalidraw file
  //in reading mode these elements should be hidden
  const excalidrawFile = Boolean(ctx.frontmatter?.hasOwnProperty("excel-plugin"));
  if (excalidrawFile) {
    el.style.display = "none";
    return;
  }

  // await processReadingMode(embeddedItems, ctx);
};
