import { readFileSync, readdirSync } from "node:fs"

const html = readFileSync("dist/index.html", "utf8")
const assets = readdirSync("dist/assets")
const jsName = assets.find((name) => name.endsWith(".js"))
const cssName = assets.find((name) => name.endsWith(".css"))
const js = readFileSync(`dist/assets/${jsName}`, "utf8")

const checks = {
  assetJsUnderAdmin: html.includes(`/admin/assets/${jsName}`),
  assetCssUnderAdmin: html.includes(`/admin/assets/${cssName}`),
  noDoubleAdminInHtml: !html.includes("/admin/admin/"),
  noRootOnlyAssets: !/src="\/assets\//.test(html),
  basenameAdmin: js.includes('"/admin"') || js.includes("'/admin'") || js.includes('basename:"/admin"') || js.includes("basename:'/admin'"),
  hasConnexionRoute: js.includes("connexion"),
  hasDashboardAlias: js.includes("dashboard"),
  noDoubleAdminInJs: !js.includes("/admin/admin"),
}

const failed = Object.entries(checks).filter(([, ok]) => !ok)
console.log(JSON.stringify({ jsName, cssName, checks }, null, 2))
if (failed.length) {
  console.error("Échecs :", failed.map(([name]) => name).join(", "))
  process.exit(1)
}
console.log("Vérifications routing/assets OK")
