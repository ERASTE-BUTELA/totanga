import assert from "node:assert/strict"
import test from "node:test"
import {
  ADMIN_BASENAME,
  DASHBOARD_ALIAS,
  DASHBOARD_PATH,
  LOGIN_ALIAS,
  LOGIN_PATH,
  adminHref,
  normalizeAdminPath,
} from "./paths.js"

test("basename is /admin without trailing slash", () => {
  assert.equal(ADMIN_BASENAME, "/admin")
})

test("normalizeAdminPath maps root and aliases to dashboard/login", () => {
  assert.equal(normalizeAdminPath("/"), DASHBOARD_PATH)
  assert.equal(normalizeAdminPath(""), DASHBOARD_PATH)
  assert.equal(normalizeAdminPath("/admin"), DASHBOARD_PATH)
  assert.equal(normalizeAdminPath("/admin/"), DASHBOARD_PATH)
  assert.equal(normalizeAdminPath(DASHBOARD_ALIAS), DASHBOARD_PATH)
  assert.equal(normalizeAdminPath("/admin/dashboard"), DASHBOARD_PATH)
  assert.equal(normalizeAdminPath(LOGIN_ALIAS), LOGIN_PATH)
  assert.equal(normalizeAdminPath("/admin/login"), LOGIN_PATH)
  assert.equal(normalizeAdminPath("/admin/connexion"), LOGIN_PATH)
})

test("normalizeAdminPath keeps catalogue routes without doubling admin", () => {
  assert.equal(normalizeAdminPath("/catalogue/livres"), "/catalogue/livres")
  assert.equal(normalizeAdminPath("/admin/catalogue/livres"), "/catalogue/livres")
  assert.equal(normalizeAdminPath("/catalogue/livres/"), "/catalogue/livres")
})

test("adminHref never produces /admin/admin", () => {
  assert.equal(adminHref("/"), "/admin/")
  assert.equal(adminHref(DASHBOARD_PATH), "/admin/")
  assert.equal(adminHref(DASHBOARD_ALIAS), "/admin/")
  assert.equal(adminHref(LOGIN_PATH), "/admin/connexion")
  assert.equal(adminHref(LOGIN_ALIAS), "/admin/connexion")
  assert.equal(adminHref("/catalogue/livres"), "/admin/catalogue/livres")
  assert.equal(adminHref("/admin/catalogue/livres"), "/admin/catalogue/livres")
  assert.ok(!adminHref("/catalogue/livres").includes("/admin/admin"))
})
