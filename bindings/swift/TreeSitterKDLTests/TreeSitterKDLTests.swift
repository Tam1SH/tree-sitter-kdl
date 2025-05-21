import XCTest
import SwiftTreeSitter
import TreeSitterKDL

final class TreeSitterKDLTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_kdl())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading KDL grammar")
    }
}
