import assert from "node:assert/strict"
import test from "node:test"
import { LOGIN_FAILED, LOGIN_LOCKED, LOGIN_REFUSED, loginError } from "./messages.js"

test("login errors stay generic", () => {
  assert.equal(loginError(401), LOGIN_REFUSED)
  assert.equal(loginError(429), LOGIN_LOCKED)
  assert.equal(loginError(500), LOGIN_FAILED)
  assert.equal(loginError(403), LOGIN_FAILED)
  for (const status of [401, 403, 429, 500]) {
    assert.equal(loginError(status).includes("existe"), false)
    assert.equal(/\d/.test(loginError(status)), false)
  }
})
