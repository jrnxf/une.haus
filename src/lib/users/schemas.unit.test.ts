import { listUsersSchema, updateUserSchema } from "./schemas"

describe("listUsersSchema", () => {
  describe("disciplines (commaArrayOf)", () => {
    it("parses comma-separated string into validated array", () => {
      const result = listUsersSchema.parse({ disciplines: "street,flatland" })
      expect(result.disciplines).toEqual(["street", "flatland"])
    })

    it("passes through array input", () => {
      const result = listUsersSchema.parse({
        disciplines: ["street", "trials"],
      })
      expect(result.disciplines).toEqual(["street", "trials"])
    })

    it("returns undefined for empty string", () => {
      const result = listUsersSchema.parse({ disciplines: "" })
      expect(result.disciplines).toBeUndefined()
    })

    it("returns undefined for undefined", () => {
      const result = listUsersSchema.parse({})
      expect(result.disciplines).toBeUndefined()
    })

    it("returns undefined for invalid enum values", () => {
      const result = listUsersSchema.parse({ disciplines: "invalid,nope" })
      expect(result.disciplines).toBeUndefined()
    })

    it("returns undefined when some values are invalid", () => {
      const result = listUsersSchema.parse({
        disciplines: "street,invalid",
      })
      // The entire array fails validation since one element is invalid
      expect(result.disciplines).toBeUndefined()
    })

    it("handles single valid value as string", () => {
      const result = listUsersSchema.parse({ disciplines: "flatland" })
      expect(result.disciplines).toEqual(["flatland"])
    })

    it("filters empty segments from comma split", () => {
      const result = listUsersSchema.parse({ disciplines: "street,,flatland" })
      expect(result.disciplines).toEqual(["street", "flatland"])
    })
  })

  describe("cursor", () => {
    it("accepts number", () => {
      const result = listUsersSchema.parse({ cursor: 10 })
      expect(result.cursor).toBe(10)
    })

    it("accepts null", () => {
      const result = listUsersSchema.parse({ cursor: null })
      expect(result.cursor).toBeNull()
    })

    it("accepts undefined", () => {
      const result = listUsersSchema.parse({})
      expect(result.cursor).toBeUndefined()
    })
  })

  describe("name", () => {
    it("accepts string", () => {
      const result = listUsersSchema.parse({ name: "Colby" })
      expect(result.name).toBe("Colby")
    })

    it("accepts undefined", () => {
      const result = listUsersSchema.parse({})
      expect(result.name).toBeUndefined()
    })
  })

  describe("id", () => {
    it("accepts number", () => {
      const result = listUsersSchema.parse({ id: 42 })
      expect(result.id).toBe(42)
    })

    it("catches invalid values and returns undefined", () => {
      const result = listUsersSchema.parse({ id: "not-a-number" })
      expect(result.id).toBeUndefined()
    })
  })
})

describe("updateUserSchema", () => {
  const validUser = {
    avatarId: null,
    bio: null,
    email: "test@example.com",
    name: "Test User",
    disciplines: null,
    location: null,
    socials: null,
  }

  it("parses valid minimal user", () => {
    const result = updateUserSchema.parse(validUser)
    expect(result.name).toBe("Test User")
    expect(result.email).toBe("test@example.com")
  })

  it("trims name and rejects empty", () => {
    expect(() => updateUserSchema.parse({ ...validUser, name: "  " })).toThrow()
  })

  it("trims email", () => {
    const result = updateUserSchema.parse({
      ...validUser,
      email: "  test@example.com  ",
    })
    expect(result.email).toBe("test@example.com")
  })

  it("rejects invalid email", () => {
    expect(() =>
      updateUserSchema.parse({ ...validUser, email: "not-email" }),
    ).toThrow()
  })

  it("trims bio", () => {
    const result = updateUserSchema.parse({
      ...validUser,
      bio: "  hello  ",
    })
    expect(result.bio).toBe("hello")
  })

  it("accepts nullable bio", () => {
    const result = updateUserSchema.parse({ ...validUser, bio: null })
    expect(result.bio).toBeNull()
  })

  describe("location", () => {
    it("accepts valid location", () => {
      const result = updateUserSchema.parse({
        ...validUser,
        location: {
          countryCode: "US",
          countryName: "United States",
          label: "New York",
          lat: 40.7128,
          lng: -74.006,
        },
      })
      expect(result.location?.label).toBe("New York")
    })

    it("accepts null location", () => {
      const result = updateUserSchema.parse({ ...validUser, location: null })
      expect(result.location).toBeNull()
    })

    it("rejects location with empty countryCode", () => {
      expect(() =>
        updateUserSchema.parse({
          ...validUser,
          location: {
            countryCode: "",
            countryName: "US",
            label: "NYC",
            lat: 0,
            lng: 0,
          },
        }),
      ).toThrow()
    })
  })

  describe("socials", () => {
    it("accepts valid URLs", () => {
      const result = updateUserSchema.parse({
        ...validUser,
        socials: {
          youtube: "https://youtube.com/@test",
          instagram: "https://instagram.com/test",
        },
      })
      expect(result.socials?.youtube).toBe("https://youtube.com/@test")
    })

    it("accepts empty strings for socials", () => {
      const result = updateUserSchema.parse({
        ...validUser,
        socials: { youtube: "", instagram: "" },
      })
      expect(result.socials?.youtube).toBe("")
    })

    it("rejects invalid URLs", () => {
      expect(() =>
        updateUserSchema.parse({
          ...validUser,
          socials: { youtube: "://invalid" },
        }),
      ).toThrow()
    })

    it("prepends https:// to bare domains", () => {
      const result = updateUserSchema.parse({
        ...validUser,
        socials: { youtube: "youtube.com/mychannel" },
      })
      expect(result.socials?.youtube).toBe("https://youtube.com/mychannel")
    })

    it("preserves http:// URLs as-is", () => {
      const result = updateUserSchema.parse({
        ...validUser,
        socials: { youtube: "http://www.youtube.com/mychannel" },
      })
      expect(result.socials?.youtube).toBe("http://www.youtube.com/mychannel")
    })

    it("preserves https:// URLs as-is", () => {
      const result = updateUserSchema.parse({
        ...validUser,
        socials: { youtube: "https://youtube.com/mychannel" },
      })
      expect(result.socials?.youtube).toBe("https://youtube.com/mychannel")
    })

    it("accepts null socials", () => {
      const result = updateUserSchema.parse({ ...validUser, socials: null })
      expect(result.socials).toBeNull()
    })
  })
})
