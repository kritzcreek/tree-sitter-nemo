import XCTest
import SwiftTreeSitter
import TreeSitterNemo

final class TreeSitterNemoTests: XCTestCase {
    func testCanLoadGrammar() throws {
        let parser = Parser()
        let language = Language(language: tree_sitter_nemo())
        XCTAssertNoThrow(try parser.setLanguage(language),
                         "Error loading Nemo grammar")
    }
}
