import ExcelPlugin from "src/main";
import { WorkspaceLeaf } from "obsidian";

const getLeafLoc = (
	leaf: WorkspaceLeaf
): ["main" | "popout" | "left" | "right" | "hover", any] => {
	//@ts-ignore
	const leafId = leaf.id;
	const layout = app.workspace.getLayout();
	const getLeaves = (l: any) =>
		l.children
			.filter((c: any) => c.type !== "leaf")
			.map((c: any) => getLeaves(c))
			.flat()
			.concat(
				l.children
					.filter((c: any) => c.type === "leaf")
					.map((c: any) => c.id)
			);

	const mainLeavesIds = getLeaves(layout.main);

	return [
		layout.main && mainLeavesIds.contains(leafId)
			? "main"
			: layout.floating && getLeaves(layout.floating).contains(leafId)
			? "popout"
			: layout.left && getLeaves(layout.left).contains(leafId)
			? "left"
			: layout.right && getLeaves(layout.right).contains(leafId)
			? "right"
			: "hover",
		mainLeavesIds,
	];
};

/*
| Setting                 |                                       Originating Leaf                                                       |
|                         | Main Workspace                   | Hover Editor                           | Popout Window                    |
| ----------------------- | -------------------------------- | -------------------------------------- | -------------------------------- |
| InMain  && InAdjacent   | 1.1 Reuse Leaf in Main Workspace | 1.1 Reuse Leaf in Main Workspace       | 1.1 Reuse Leaf in Main Workspace |
| InMain  && !InAdjacent  | 1.2 New Leaf in Main Workspace   | 1.2 New Leaf in Main Workspace         | 1.2 New Leaf in Main Workspace   |
| !InMain && InAdjacent   | 1.1 Reuse Leaf in Main Workspace | 3   Reuse Leaf in Current Hover Editor | 4   Reuse Leaf in Current Popout |
| !InMain && !InAdjacent  | 1.2 New Leaf in Main Workspace   | 2   New Leaf in Current Hover Editor   | 2   New Leaf in Current Popout   |
*/
export const getNewOrAdjacentLeaf = (
	plugin: ExcelPlugin,
	leaf: WorkspaceLeaf
): WorkspaceLeaf | null => {
	const [leafLoc, mainLeavesIds] = getLeafLoc(leaf);

	const getMostRecentOrAvailableLeafInMainWorkspace = (
		inDifferentTabGroup?: boolean
	): WorkspaceLeaf | null => {
		let mainLeaf = app.workspace.getMostRecentLeaf();
		if (
			mainLeaf &&
			mainLeaf !== leaf &&
			mainLeaf.view?.containerEl.ownerDocument === document
		) {
			//Found a leaf in the main workspace that is not the originating leaf
			return mainLeaf;
		}
		//Iterate all leaves in the main workspace and find the first one that is not the originating leaf
		mainLeaf = null;
		mainLeavesIds.forEach((id: any) => {
			const l = app.workspace.getLeafById(id);
			if (
				mainLeaf ||
				!l.view?.navigation ||
				leaf === l ||
				//@ts-ignore
				(inDifferentTabGroup && l?.parent === leaf?.parent)
			)
				return;
			mainLeaf = l;
		});
		return mainLeaf;
	};

	//1 - In Main Workspace
	if (["main", "left", "right"].contains(leafLoc)
	) {
		//1.2 - Reuse leaf if it is adjacent
		const ml = getMostRecentOrAvailableLeafInMainWorkspace(true);
		return ml ?? app.workspace.createLeafBySplit(leaf); //app.workspace.getLeaf(true);
	}

	// //3
	// if (leafLoc === "hover") {
	// 	const leaves = new Set<WorkspaceLeaf>();
	// 	app.workspace.iterateAllLeaves((l) => {
	// 		//@ts-ignore
	// 		if (
	// 			l !== leaf &&
	// 			leaf.containerEl.parentElement === l.containerEl.parentElement
	// 		)
	// 			leaves.add(l);
	// 	});
	// 	if (leaves.size === 0) {
	// 		return plugin.app.workspace.createLeafBySplit(leaf);
	// 	}
	// 	return Array.from(leaves)[0];
	// }

	//4
	if (leafLoc === "popout") {
		const popoutLeaves = new Set<WorkspaceLeaf>();
		app.workspace.iterateAllLeaves((l) => {
			if (
				l !== leaf &&
				l.view.navigation &&
				l.view.containerEl.ownerDocument ===
					leaf.view.containerEl.ownerDocument
			) {
				popoutLeaves.add(l);
			}
		});
		if (popoutLeaves.size === 0) {
			return app.workspace.createLeafBySplit(leaf);
		}
		return Array.from(popoutLeaves)[0];
	}

	return plugin.app.workspace.createLeafBySplit(leaf);
};
