import assert from "node:assert/strict"
import test from "node:test"
import { USER_FACING_ERROR_MESSAGE, userFacingError } from "./errors.js"

test("le message montré au visiteur reste général", () => {
  const error = userFacingError()
  assert.equal(error.message, USER_FACING_ERROR_MESSAGE)
  assert.equal(error.message.includes("SQL"), false)
  assert.equal(error.message.includes("fetch"), false)
  assert.equal(error.message.includes("TypeError"), false)
})
