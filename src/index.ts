import extractData from "./identifier";
import * as parser from "@babel/parser";
import * as vm from "vm";
import * as t from "@babel/types";
// @ts-ignore - @babel/generator doesn't have type definitions
import generate from "@babel/generator";
import type { Statement, ReturnStatement } from "@babel/types";

interface VMContext {
  window: {
    charCodeAt: typeof String.prototype.charCodeAt;
    charAt: typeof String.prototype.charAt;
    String: typeof String;
    Array: typeof Array;
    Object: typeof Object;
    Function: typeof Function;
    Boolean: typeof Boolean;
    Number: typeof Number;
    Math: typeof Math;
    BigInt: typeof BigInt;
    Buffer: typeof Buffer;
    process: typeof process;
    console: typeof console;
    require: typeof require;
    module: typeof module;
    exports: typeof exports;
    parseFloat: typeof parseFloat;
  };
  [key: string]: any;
}

interface StatementType {
  type: (statement: Statement) => boolean;
  name: string;
  errorHandling?: boolean;
}

export default function extractFileHash(fileContent: string): number {
  const res = extractData(fileContent);
  const ast = parser.parse(fileContent, {});

  const context: VMContext = vm.createContext({
    window: {
      charCodeAt: String.prototype.charCodeAt,
      charAt: String.prototype.charAt,
      String: String,
      Array: Array,
      Object: Object,
      Function: Function,
      Boolean: Boolean,
      Number: Number,
      Math: Math,
      BigInt: BigInt,
      Buffer: Buffer,
      process: process,
      console: console,
      require: require,
      module: module,
      exports: exports,
      parseFloat: parseFloat,
    },
  }) as VMContext;

  const secondBody = ast.program.body[1];
  if (!secondBody || !t.isExpressionStatement(secondBody)) {
    throw new TypeError("Expected expression statement at index 1");
  }

  const expression = secondBody.expression;
  if (
    !t.isCallExpression(expression) ||
    !t.isFunctionExpression(expression.callee)
  ) {
    throw new TypeError("Expected call expression with function callee");
  }

  const calleeBody = expression.callee.body;
  if (!calleeBody || !t.isBlockStatement(calleeBody)) {
    throw new TypeError("Expected block statement in callee body");
  }

  const expressionStatement: Statement[] = calleeBody.body;

  const statementTypes: StatementType[] = [
    { type: t.isVariableDeclaration, name: "VariableDeclaration" },
    { type: t.isFunctionDeclaration, name: "FunctionDeclaration" },
    { type: t.isExpressionStatement, name: "ExpressionStatement" },
    {
      type: (statement: Statement): statement is ReturnStatement =>
        t.isReturnStatement(statement) &&
        statement.argument !== null &&
        t.isCallExpression(statement.argument),
      name: "ReturnStatement",
      errorHandling: true,
    },
  ];

  statementTypes.forEach(({ type, name, errorHandling }) => {
    if (errorHandling) {
      expressionStatement.forEach((statement) => {
        if (type(statement)) {
          try {
            const returnStmt = statement as ReturnStatement;
            if (
              returnStmt.argument &&
              t.isCallExpression(returnStmt.argument)
            ) {
              vm.runInContext(generate(returnStmt.argument).code, context);
            }
          } catch {
            // Silently handle execution errors
          }
        }
      });
    } else {
      expressionStatement.forEach((statement) => {
        if (type(statement)) {
          vm.runInContext(generate(statement).code, context);
        }
      });
    }
  });

  if (res.index === undefined || res.index === null) {
    throw new TypeError("Index not found in extracted data");
  }

  vm.runInContext(res.legenda.code, context);

  return res.list.map((item) =>
    parseFloat(
      Array.from(item)
        .map((char) => context[res.legenda.name][char])
        .join("")
    )
  )[context[res.index] as number];
}