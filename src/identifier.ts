import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import * as t from "@babel/types";
// @ts-ignore - @babel/generator doesn't have type definitions
import generate from "@babel/generator";
import type {
  Node,
  File,
  VariableDeclarator,
  FunctionDeclaration,
  MemberExpression,
} from "@babel/types";
import type { NodePath } from "@babel/traverse";

interface IndexResult {
  list: string;
  index: string;
}

interface HexObjectResult {
  node: VariableDeclarator;
  legenda: {
    name: string;
    code: string;
  };
}

interface ListArrayResult {
  index: string;
  list: string[];
}

interface MainResult {
  index: string | null;
  list: string[];
  legenda: {
    name: string;
    code: string;
  };
}

function identifyIndex(ast: File | Node): string | null {
  const resultRef: { value: IndexResult | null } = { value: null };
  let targetFunctionName: string | null = null;
  let importantValueName: string | null = null;
  traverse(ast, {
    VariableDeclarator(path: NodePath<VariableDeclarator>) {
      const node = path.node;

      if (
        node.init &&
        t.isLogicalExpression(node.init) &&
        node.init.operator === "||"
      ) {
        const left = node.init.left;
        const right = node.init.right;

        if (t.isCallExpression(right)) {
          if (t.isIdentifier(left)) {
            if (t.isIdentifier(right.callee)) {
              targetFunctionName = right.callee.name;
            }
          }
        }
      }
    },
  });

  if (!targetFunctionName) {
    return null;
  }

  let functionDeclaration: Node | null = null;

  traverse(ast, {
    FunctionDeclaration(path: NodePath<FunctionDeclaration>) {
      const node = path.node;
      if (node.id && node.id.name === targetFunctionName) {
        functionDeclaration = node;
        path.stop();
      }
    },
    VariableDeclarator(path: NodePath<VariableDeclarator>) {
      const node = path.node;
      if (
        t.isIdentifier(node.id) &&
        node.id.name === targetFunctionName &&
        node.init &&
        t.isFunctionExpression(node.init)
      ) {
        functionDeclaration = node;
        path.stop();
      }
    },
  });

  if (!functionDeclaration) {
    return null;
  }

  const functionCode = generate(functionDeclaration).code;
  const functionAst = parser.parse(functionCode, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  let importantValue: string | null = null;

  traverse(functionAst, {
    VariableDeclarator(nodePath: NodePath<VariableDeclarator>) {
      const node = nodePath.node;

      if (
        node.init &&
        t.isArrayExpression(node.init) &&
        node.init.elements.length >= 2
      ) {
        const secondElement = node.init.elements[1];

        if (secondElement && t.isIdentifier(secondElement)) {
          importantValue = secondElement.name;
          importantValueName = secondElement.name;
        }
      }
    },
  });

  if (!importantValue) {
    return null;
  }

  traverse(ast, {
    VariableDeclarator(nodePath: NodePath<VariableDeclarator>) {
      const node = nodePath.node;

      if (t.isIdentifier(node.id) && node.id.name === importantValueName) {
        function findLastMemberExpression(
          node: Node | null
        ): MemberExpression | null {
          if (!node) return null;

          if (t.isCallExpression(node)) {
            const args = node.arguments;
            if (args.length > 0) {
              const lastArg = args[args.length - 1];
              if (t.isMemberExpression(lastArg)) {
                return lastArg;
              }
              return findLastMemberExpression(lastArg);
            }
          }

          if (t.isMemberExpression(node)) {
            return node;
          }
          for (const key of Object.keys(node)) {
            const value = (node as any)[key];
            if (value && typeof value === "object" && value !== null) {
              const found = findLastMemberExpression(value as Node | null);
              if (found) return found;
            }
          }

          return null;
        }

        const lastMemberExpr = findLastMemberExpression(node.init ?? null);

        if (
          lastMemberExpr &&
          node.init &&
          t.isCallExpression(node.init) &&
          node.init.arguments.length > 0
        ) {
          const firstArg = node.init.arguments[0];
          if (
            firstArg &&
            t.isCallExpression(firstArg) &&
            firstArg.arguments.length > 0
          ) {
            const element = firstArg.arguments[0];
            if (
              element &&
              t.isMemberExpression(element) &&
              t.isIdentifier(element.object) &&
              t.isIdentifier(element.property)
            ) {
              resultRef.value = {
                list: element.object.name,
                index: element.property.name,
              };
            }
          }
        }
      }
    },
  });

  return resultRef.value?.index ?? null;
}

function findObjectsWithHexKeys(ast: File | Node): HexObjectResult | null {
  let result: HexObjectResult | null = null;

  traverse(ast, {
    VariableDeclarator(path: NodePath<VariableDeclarator>) {
      try {
        if (path.node.init && path.node.init.type === "ObjectExpression") {
          const obj = path.node.init;
          let hexKeys = 0;
          let functionCalls = 0;

          obj.properties.forEach((prop) => {
            try {
              if (
                t.isObjectProperty(prop) &&
                prop.key &&
                t.isStringLiteral(prop.key)
              ) {
                const key = prop.key.value;
                if (key && key.length === 1 && /[\x20-\x7F]/.test(key)) {
                  hexKeys++;
                }
              }

              if (t.isObjectProperty(prop) && prop.value) {
                const value = prop.value;
                if (
                  t.isCallExpression(value) ||
                  (t.isConditionalExpression(value) &&
                    ((value.consequent &&
                      t.isCallExpression(value.consequent)) ||
                      (value.alternate &&
                        t.isCallExpression(value.alternate)))) ||
                  (t.isLogicalExpression(value) &&
                    ((value.left && t.isCallExpression(value.left)) ||
                      (value.right && t.isCallExpression(value.right))))
                ) {
                  functionCalls++;
                }
              }
            } catch {
              // Ignore errors during property processing
            }
          });

          if (hexKeys === 11 && functionCalls >= 11) {
            if (t.isIdentifier(path.node.id)) {
              result = {
                node: path.node,
                legenda: {
                  name: path.node.id.name,
                  code: generate(path.node).code,
                },
              };
              path.stop();
            }
          }
        }
      } catch {
        // Ignore errors during variable declarator processing
      }
    },
  });

  return result;
}

function findListArray(ast: File | Node): ListArrayResult | null {
  let result: ListArrayResult | null = null;

  traverse(ast, {
    AssignmentExpression(path) {
      const node = path.node;
      if (
        node.right &&
        t.isCallExpression(node.right) &&
        node.right.arguments &&
        node.right.arguments.length > 1 &&
        node.right.arguments[1] &&
        t.isArrayExpression(node.right.arguments[1])
      ) {
        const arrayArg = node.right.arguments[1];
        if (
          t.isArrayExpression(arrayArg) &&
          arrayArg.elements &&
          arrayArg.elements.length > 0 &&
          arrayArg.elements[0] &&
          t.isArrayExpression(arrayArg.elements[0])
        ) {
          const innerArray = arrayArg.elements[0];
          if (
            innerArray.elements &&
            innerArray.elements.every(
              (el) => el !== null && el !== undefined && t.isStringLiteral(el)
            ) &&
            innerArray.elements.length >= 10
          ) {
            if (t.isIdentifier(node.left)) {
              result = {
                index: node.left.name,
                list: innerArray.elements
                  .filter(
                    (el): el is t.StringLiteral =>
                      el !== null && el !== undefined && t.isStringLiteral(el)
                  )
                  .map((el) => el.value),
              };
              path.stop();
            }
          }
        }
      }
    },
  });

  return result;
}

function extractData(code: string | File | Node): MainResult {
  try {
    const ast = typeof code === "string" ? parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx"],
    }) : code;
    const hexObject = findObjectsWithHexKeys(ast);
    const listData = findListArray(ast);

    if (!hexObject || !listData) {
      throw new Error("Could not find all required elements");
    }

    return {
      index: identifyIndex(ast),
      list: listData.list,
      legenda: hexObject.legenda,
    };
  } catch (error) {
    throw error;
  }
}

export default extractData;
