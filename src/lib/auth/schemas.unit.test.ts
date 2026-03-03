import { enterCodeSchema, registerSchema, sendCodeSchema } from "./schemas"

describe("sendCodeSchema", () => {
  it("accepts valid email", () => {
    const result = sendCodeSchema.safeParse({ email: "test@example.com" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("test@example.com")
    }
  })

  it("trims whitespace from email", () => {
    const result = sendCodeSchema.safeParse({ email: "  test@example.com  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("test@example.com")
    }
  })

  it("converts email to lowercase", () => {
    const result = sendCodeSchema.safeParse({ email: "TEST@EXAMPLE.COM" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("test@example.com")
    }
  })

  it("rejects invalid email format", () => {
    const result = sendCodeSchema.safeParse({ email: "not-an-email" })
    expect(result.success).toBe(false)
  })

  it("rejects empty email", () => {
    const result = sendCodeSchema.safeParse({ email: "" })
    expect(result.success).toBe(false)
  })

  it("rejects missing email", () => {
    const result = sendCodeSchema.safeParse({})
    expect(result.success).toBe(false)
  })

  it("rejects email without domain", () => {
    const result = sendCodeSchema.safeParse({ email: "test@" })
    expect(result.success).toBe(false)
  })

  it("rejects email without @ symbol", () => {
    const result = sendCodeSchema.safeParse({ email: "testexample.com" })
    expect(result.success).toBe(false)
  })
})

describe("enterCodeSchema", () => {
  it("accepts valid code", () => {
    const result = enterCodeSchema.safeParse({ code: "123456" })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe("123456")
    }
  })

  it("trims whitespace from code", () => {
    const result = enterCodeSchema.safeParse({ code: "  123456  " })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.code).toBe("123456")
    }
  })

  it("accepts alphabetic codes", () => {
    const result = enterCodeSchema.safeParse({ code: "ABCDEF" })
    expect(result.success).toBe(true)
  })

  it("accepts alphanumeric codes", () => {
    const result = enterCodeSchema.safeParse({ code: "ABC123" })
    expect(result.success).toBe(true)
  })

  it("rejects missing code", () => {
    const result = enterCodeSchema.safeParse({})
    expect(result.success).toBe(false)
  })
})

describe("registerSchema", () => {
  const validData = {
    code: "123456",
    email: "test@example.com",
    name: "John Doe",
  }

  it("accepts valid registration data", () => {
    const result = registerSchema.safeParse(validData)
    expect(result.success).toBe(true)
  })

  it("accepts registration with optional bio", () => {
    const result = registerSchema.safeParse({
      ...validData,
      bio: "I love unicycling!",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bio).toBe("I love unicycling!")
    }
  })

  it("accepts registration without bio", () => {
    const result = registerSchema.safeParse(validData)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bio).toBeUndefined()
    }
  })

  it("trims name", () => {
    const result = registerSchema.safeParse({
      ...validData,
      name: "  John Doe  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.name).toBe("John Doe")
    }
  })

  it("normalizes email", () => {
    const result = registerSchema.safeParse({
      ...validData,
      email: "  TEST@EXAMPLE.COM  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.email).toBe("test@example.com")
    }
  })

  it("rejects empty name", () => {
    const result = registerSchema.safeParse({
      ...validData,
      name: "",
    })
    expect(result.success).toBe(false)
  })

  it("rejects whitespace-only name", () => {
    const result = registerSchema.safeParse({
      ...validData,
      name: "   ",
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0]?.message).toBe("Required")
    }
  })

  it("rejects missing required fields", () => {
    expect(registerSchema.safeParse({ code: "123" }).success).toBe(false)
    expect(
      registerSchema.safeParse({ email: "test@example.com" }).success,
    ).toBe(false)
    expect(registerSchema.safeParse({ name: "John" }).success).toBe(false)
  })

  it("trims bio if provided", () => {
    const result = registerSchema.safeParse({
      ...validData,
      bio: "  My bio  ",
    })
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.bio).toBe("My bio")
    }
  })
})
