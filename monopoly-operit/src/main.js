"use strict";
// ============================================================
// 大富翁 · 主入口（注册侧边栏面板）
// ============================================================
var ROUTE_ID = "monopoly_board";
var PKG_ID = "com.yuheng.monopoly";

var __importDefault = function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var ui = __importDefault(require("./ui/monopoly.ui.js"));
var buildScreen = ui.default;
if (typeof buildScreen !== "function" && ui && typeof ui.Screen === "function") {
    buildScreen = ui.Screen;
}

function registerToolPkg() {
    ToolPkg.registerUiRoute({
        id: ROUTE_ID,
        runtime: "compose_dsl",
        screen: buildScreen,
        params: {},
        title: { zh: "🎲 大富翁", en: "🎲 Monopoly" }
    });
    ToolPkg.registerNavigationEntry({
        id: "monopoly_board_nav",
        route: "toolpkg:" + PKG_ID + ":ui:" + ROUTE_ID,
        surface: "main_sidebar_plugins",
        title: { zh: "🎲 大富翁", en: "🎲 Monopoly" },
        order: 215
    });
    return true;
}

exports.registerToolPkg = registerToolPkg;
module.exports = { registerToolPkg: registerToolPkg };
