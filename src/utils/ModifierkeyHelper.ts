
export type PaneTarget = "active-pane"|"new-pane"|"popout-window"|"new-tab"|"md-properties";
export type ModifierKeys = {shiftKey:boolean, ctrlKey: boolean, metaKey: boolean, altKey: boolean};
export type KeyEvent = PointerEvent | MouseEvent | KeyboardEvent | ModifierKeys; 

export type DeviceType = {
  isDesktop: boolean,
  isPhone: boolean,
  isTablet: boolean,
  isMobile: boolean,
  isLinux: boolean,
  isMacOS: boolean,
  isWindows: boolean,
  isIOS: boolean,
  isAndroid: boolean
};

export const DEVICE: DeviceType = {
  isDesktop: !document.body.hasClass("is-tablet") && !document.body.hasClass("is-mobile"),
  isPhone: document.body.hasClass("is-phone"),
  isTablet: document.body.hasClass("is-tablet"),
  isMobile: document.body.hasClass("is-mobile"), //running Obsidian Mobile, need to also check isTablet
  isLinux: document.body.hasClass("mod-linux") && ! document.body.hasClass("is-android"),
  isMacOS: document.body.hasClass("mod-macos") && ! document.body.hasClass("is-ios"),
  isWindows: document.body.hasClass("mod-windows"),
  isIOS: document.body.hasClass("is-ios"),
  isAndroid: document.body.hasClass("is-android")
};

export const isCTRL = (e:KeyEvent) => DEVICE.isIOS || DEVICE.isMacOS ? e.metaKey : e.ctrlKey;
export const isALT = (e:KeyEvent) => e.altKey;
export const isMETA = (e:KeyEvent) => DEVICE.isIOS || DEVICE.isMacOS ? e.ctrlKey : e.metaKey;
export const isSHIFT = (e:KeyEvent) => e.shiftKey;
export const mdPropModifier = (ev: KeyEvent): boolean => !isSHIFT(ev) && isCTRL(ev) && !isALT(ev) && isMETA(ev);

export const emulateCTRLClickForLinks = (e: KeyEvent) => {
  return {
    shiftKey: e.shiftKey,
    ctrlKey: e.ctrlKey || !(DEVICE.isIOS || DEVICE.isMacOS),
    metaKey: e.metaKey ||  (DEVICE.isIOS || DEVICE.isMacOS),
    altKey: e.altKey
  }
}

export const linkClickModifierType = (ev: KeyEvent):PaneTarget => {
  if(isCTRL(ev) && !isALT(ev) && isSHIFT(ev) && !isMETA(ev)) return "active-pane";
  if(isCTRL(ev) && !isALT(ev) && !isSHIFT(ev) && !isMETA(ev)) return "new-tab";
  if(isCTRL(ev) && isALT(ev) && !isSHIFT(ev) && !isMETA(ev)) return "new-pane";
  if(DEVICE.isDesktop && isCTRL(ev) && isALT(ev) && isSHIFT(ev) && !isMETA(ev) ) return "popout-window";
  if(isCTRL(ev) && isALT(ev) && isSHIFT(ev) && !isMETA(ev)) return "new-tab";
  if(mdPropModifier(ev)) return "md-properties";
  return "active-pane";
}