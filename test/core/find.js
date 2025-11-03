const { expect } = require("chai")
const { getCompatProp } = require("../../lib/utils")

function find(app, serviceName, esVersion) {
  describe("find()", () => {
    it("should return empty array if no results found", () => {
      return app
        .service(serviceName)
        .find({ query: { id: "better-luck-next-time" } })
        .then((results) => {
          expect(results).to.be.an("array").and.be.empty
        })
    })

    it("should return empty paginated results if no results found", () => {
      return app
        .service(serviceName)
        .find({
          query: { id: "better-luck-next-time" },
          paginate: { default: 10 },
        })
        .then((results) => {
          expect(results.total).to.equal(0)
          expect(results.data).to.be.an("array").and.be.empty
        })
    })

    it("should filter results by array parameter", () => {
      return app
        .service(serviceName)
        .find({
          query: { tags: ["legend", "javascript"] },
        })
        .then((results) => {
          expect(results.length).to.equal(1)
          expect(results[0].name).to.equal("Douglas")
        })
    })

    describe("special filters", () => {
      it("can $prefix", () => {
        return app
          .service(serviceName)
          .find({
            query: { name: { $prefix: "B" } },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $wildcard", () => {
        return app
          .service(serviceName)
          .find({
            query: { name: { $wildcard: "B*b" } },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $regexp", () => {
        return app
          .service(serviceName)
          .find({
            query: { name: { $regexp: "Bo[xb]" } },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $all", () => {
        const expectedLength = getCompatProp(
          {
            "5.0": 3,
            "6.0": 6,
          },
          esVersion
        )

        return app
          .service(serviceName)
          .find({
            query: { $all: true },
          })
          .then((results) => {
            expect(results.length).to.equal(expectedLength)
          })
      })

      it("can $match", () => {
        return app
          .service(serviceName)
          .find({
            query: { bio: { $match: "I like JavaScript" } },
          })
          .then((results) => {
            expect(results.length).to.equal(2)
          })
      })

      it("can $phrase", () => {
        return app
          .service(serviceName)
          .find({
            query: { bio: { $phrase: "I like JavaScript" } },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $phrase_prefix", () => {
        return app
          .service(serviceName)
          .find({
            query: { bio: { $phrase_prefix: "I like JavaS" } },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $or correctly with other filters", () => {
        return app
          .service(serviceName)
          .find({
            query: {
              $or: [{ name: "Moody" }, { name: "Douglas" }],
              bio: { $match: "JavaScript legend" },
            },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Douglas")
          })
      })

      it("can $and", () => {
        return app
          .service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $and: [{ tags: "javascript" }, { tags: "programmer" }],
            },
          })
          .then((results) => {
            expect(results.length).to.equal(2)
            expect(results[0].name).to.equal("Bob")
            expect(results[1].name).to.equal("Douglas")
          })
      })

      it("can $sqs (simple_query_string)", () => {
        return app
          .service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $sqs: {
                $fields: ["bio", "name^5"],
                $query: "+like -javascript",
                $operator: "and",
              },
            },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Moody")
          })
      })

      it("can $sqs (simple_query_string) with other filters", () => {
        return app
          .service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $and: [{ tags: "javascript" }],
              $sqs: {
                $fields: ["bio"],
                $query: "-legend",
              },
            },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $child", () => {
        const types = {
          "5.0": "aka",
          "6.0": "alias",
        }

        return app
          .service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $child: {
                $type: getCompatProp(types, esVersion),
                name: "Teacher",
              },
            },
          })
          .then((results) => {
            expect(results.length).to.equal(2)
            expect(results[0].name).to.equal("Douglas")
            expect(results[1].name).to.equal("Moody")
          })
      })

      it("can $parent", () => {
        const types = {
          "5.0": "people",
          "6.0": "real",
        }

        return app
          .service("aka")
          .find({
            query: {
              $sort: { name: 1 },
              $parent: {
                $type: getCompatProp(types, esVersion),
                name: "Douglas",
              },
            },
          })
          .then((results) => {
            expect(results.length).to.equal(2)
            expect(results[0].name).to.equal("Teacher")
            expect(results[1].name).to.equal("The Master")
          })
      })

      it("can $nested", () => {
        return app
          .service(serviceName)
          .find({
            query: {
              $nested: {
                $path: "addresses",
                "addresses.street": "1 The Road",
              },
            },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Bob")
          })
      })

      it("can $exists", () => {
        return app
          .service(serviceName)
          .find({
            query: {
              $exists: ["phone"],
            },
          })
          .then((results) => {
            expect(results.length).to.equal(1)
            expect(results[0].name).to.equal("Douglas")
          })
      })

      it("can $missing", () => {
        const expectedLength = getCompatProp(
          {
            "5.0": 2,
            "6.0": 5,
          },
          esVersion
        )

        return app
          .service(serviceName)
          .find({
            query: {
              $sort: { name: 1 },
              $missing: ["phone"],
            },
          })
          .then((results) => {
            expect(results.length).to.equal(expectedLength)
            expect(results[0].name).to.equal("Bob")
            expect(results[1].name).to.equal("Moody")
          })
      })
    })
  })
}

module.exports = find
