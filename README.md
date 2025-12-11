# akamai-filehash-helper

A Node.js module for extracting filehash values from obfuscated JavaScript code using Babel AST parsing.

## Overview

This project extracts filehash values from obfuscated JavaScript files, particularly those related to Akamai sensor data. It uses Babel's Abstract Syntax Tree (AST) parser to analyze and extract the necessary data structures from complex, obfuscated code.

## Original Source

This project is based on the original work from:
- **Repository**: [glizzykingdreko/akamai-v3-sensor-data-helper](https://github.com/glizzykingdreko/akamai-v3-sensor-data-helper)

## Installation

```bash
npm install akamai-filehash-helper
```

Or using pnpm:

```bash
pnpm install akamai-filehash-helper
```

## Usage

```typescript
import extractFileHash from 'akamai-filehash-helper';
import fs from 'fs';

// Read the obfuscated JavaScript file
const fileContent = fs.readFileSync('path/to/obfuscated-file.js', 'utf-8');

// Extract the filehash
const fileHash = extractFileHash(fileContent);

console.log('Extracted filehash:', fileHash);
```

## API

### `extractFileHash(fileContent: string): number`

Extracts and returns the filehash value from the provided JavaScript code.

**Parameters:**
- `fileContent` (string): The content of the obfuscated JavaScript file

**Returns:**
- `number`: The extracted filehash value

**Throws:**
- `Error`: If the expected structure is not found in the code or if required elements are missing

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

## Dependencies

- `@babel/generator` - Code generation from AST
- `@babel/parser` - JavaScript parsing
- `@babel/traverse` - AST traversal
- `@babel/types` - AST node types

## License

MIT

