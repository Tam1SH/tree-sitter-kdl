import XCTest
import SwiftTreeSitter
import TreeSitterKdl

final class TreeSitterKdlTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_kdl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Kdl grammar")
    }
}
