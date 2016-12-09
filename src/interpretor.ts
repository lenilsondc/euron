enum TokenType {

    ID, // variable|function name: ^[a-z][a-z0-9]*$

    NUMBER, // 0123456789

    ASIGN, // =

    LPAREN, // (
    RPAREN, // )

    COMMA, // ,

    PLUS, // +
    MINUS, // -
    MULT, // *
    DIVI, // /

    POW, // ^
    FACTORIAL, // !

    EOL, // end-of-line
    EOF // end-of-file
}

class Token {

    public type: TokenType;
    public value: string;

    constructor(type: TokenType, value: string = null) {
        this.type = type;
        this.value = value;
    }
}

interface StringAnalyzerPredicate {
    (input: string): boolean;
}

class Lexer {

    public text: string;
    private lexCursor: number = 0;

    constructor(input: string) {
        this.text = input;
    }

    public advance() {
        this.lexCursor++;
    }

    private currentChar(): string {
        return this.text[this.lexCursor];
    }

    private read(predicate: StringAnalyzerPredicate): string {
        let token = '';

        while (predicate(this.text[this.lexCursor])) {
            token += this.text[this.lexCursor];

            this.advance();
        }

        return token;
    }

    private isNumber(input: string): boolean {
        return /[\d\.]+?/.test(input);
    }

    private readNumber(): string {
        return this.read(this.isNumber);
    }

    private isWhiteSpace(input: string): boolean {
        return /\s+/.test(input);
    }

    private readWhiteSpace(): string {
        return this.read(this.isWhiteSpace);
    }

    private isAlphaNumeric(input: string): boolean {
        return input !== undefined && /[a-zA-Z][a-zA-Z0-9]*/.test(input);
    }

    private readAlphaNumeric(): string {
        return this.read(this.isAlphaNumeric);
    }

    public nextToken(): Token {
        let char = this.currentChar();

        switch (char) {
            case '\t':
            case '\v':
            case ' ':
            case '\f':
                this.readWhiteSpace();
                return this.nextToken();
            case '\n':
                return new Token(TokenType.EOL, '\n');
            case '0':
            case '1':
            case '2':
            case '3':
            case '4':
            case '5':
            case '6':
            case '7':
            case '8':
            case '9':
            case '.':
                return new Token(TokenType.NUMBER, this.readNumber());
            case '+':
                this.advance();
                return new Token(TokenType.PLUS, char);
            case '-':
                this.advance();
                return new Token(TokenType.MINUS, char);
            case '*':
                this.advance();
                return new Token(TokenType.MULT, char);
            case '/':
                this.advance();
                return new Token(TokenType.DIVI, char);
            case '^':
                this.advance();
                return new Token(TokenType.POW, char);
            case '!':
                this.advance();
                return new Token(TokenType.FACTORIAL, char);
            case '=':
                this.advance();
                return new Token(TokenType.ASIGN, char);
            case '(':
                this.advance();
                return new Token(TokenType.LPAREN, char);
            case ')':
                this.advance();
                return new Token(TokenType.RPAREN);
            case ',':
                this.advance();
                return new Token(TokenType.COMMA);
            default:

                if (this.isAlphaNumeric(char)) {
                    let id = this.readAlphaNumeric();

                    switch (id.toLowerCase()) {
                        case 'e':
                            return new Token(TokenType.ID, 'e');
                        case 'pi':
                            return new Token(TokenType.ID, 'pi');

                        default:
                            throw new Error(`wooops! unespected sequence '${id}' at ${this.lexCursor}`);
                    }

                } else if (char != undefined) {
                    throw new Error(`wooops! unespected char '${char}' at ${this.lexCursor}`);
                }
        }

        return new Token(TokenType.EOF);
    }
}

interface IASTVisitor {
    visitUnaryExpr(unaryExpr: UnaryExpr): void;
    visitValueExpr(valueExpr: ValueExpr): void;
    visitFactorialExpr(factorialExpr: FactorialExpr): void;
    visitBinaryExpr(binaryExpr: BinaryExpr): void;
    visitConstExpr(constExpr: ConstExpr): void;
}

class ASTPrinterVisitor implements IASTVisitor {

    public stack: string[] = [];
    public output: string = '';

    public getOutput(): string {
        return this.stack.join('');
    }

    public visitUnaryExpr(unaryExpr: UnaryExpr) {
        let signFactor = 1;

        switch (unaryExpr.opToken) {
            //case TokenType.PLUS:
            case TokenType.MINUS:
                signFactor = -1;
                break;
        }

        unaryExpr.expr.accept(this);

        if (unaryExpr.expr instanceof ValueExpr || unaryExpr.expr instanceof FactorialExpr) {
            this.stack.push(`${signFactor}${this.stack.pop()}`);
        } else {
            this.stack.push(`${signFactor}(${this.stack.pop()})`);
        }

        if (this.stack.length === 0) {
            this.output = this.stack.join('');
        }
    }

    public visitValueExpr(valueExpr: ValueExpr) {

        this.stack.push(`${valueExpr.num}`);

        if (this.stack.length === 0) {
            this.output = this.stack.join('');
        }
    }

    private constTable: any = {
        'pi': '&pi;',
        'e': '<i>e</i>'
    };

    public visitConstExpr(constExpr: ConstExpr) {

        let result = this.constTable[constExpr.constToken.value];

        if (result === undefined) {
            throw new Error("Undefined symbol '${constExpr.constToken.value}'.");
        }

        this.stack.push(`${result}`);

        if (this.stack.length === 0) {
            this.output = this.stack.join('');
        }
    }


    public visitFactorialExpr(factorialExpr: FactorialExpr) {
        factorialExpr.factor.accept(this);

        if (factorialExpr.factor instanceof ValueExpr || factorialExpr.factor instanceof FactorialExpr || factorialExpr.factor instanceof ConstExpr) {
            this.stack.push(`!${this.stack.pop()}`);
        } else {
            this.stack.push(`!(${this.stack.pop()})`);
        }

        if (this.stack.length === 0) {
            this.output = this.stack.join('');
        }
    }

    public visitBinaryExpr(binaryExpr: BinaryExpr) {
        binaryExpr.left.accept(this);

        let left = '';

        if (binaryExpr.left instanceof ValueExpr || binaryExpr.left instanceof FactorialExpr
            || ((binaryExpr.left instanceof BinaryExpr) && (
                (<BinaryExpr>binaryExpr.left).token === TokenType.DIVI || (<BinaryExpr>binaryExpr.left).token === binaryExpr.token))
            || binaryExpr.left instanceof ConstExpr) {
            left += `${this.stack.pop()}`;
        } else {
            left += `(${this.stack.pop()})`;
        }

        binaryExpr.right.accept(this);

        let right = '';

        if (binaryExpr.right instanceof ValueExpr || binaryExpr.right instanceof FactorialExpr
            || ((binaryExpr.right instanceof BinaryExpr) && (
                (<BinaryExpr>binaryExpr.right).token === TokenType.DIVI || (<BinaryExpr>binaryExpr.right).token === binaryExpr.token))
            || binaryExpr.right instanceof ConstExpr) {
            right += `${this.stack.pop()}`;
        } else {
            right += `(${this.stack.pop()})`;
        }

        this.stack.push(this.resolve(binaryExpr.token, left, right));

        if (this.stack.length === 0) {
            this.output = this.stack.join('');
        }
    }

    private resolve(type: TokenType, left: string, right: string): string {
        switch (type) {
            case TokenType.PLUS:
                return `${left} + ${right}`;
            case TokenType.MINUS:
                return `${left} - ${right}`;
            case TokenType.DIVI:
                return `<sup>${left}</sup>&frasl;<sub>${right}</sub>`;
            case TokenType.MULT:
                return `${left} &times; ${right}`;
            case TokenType.POW:
                // expression for squared
                //return `<span class="radic"><sup><var>${right}</var></sup>&#8730;</span><span class="radicand">${left}</span>`;
                return `${left}<sup>${right}</sup>`;
            default:
                throw `Unexpected token type '${TokenType[type]}' in binary operation!`;
        }
    };
}

class ASTCalculatorVisitor implements IASTVisitor {

    public stack: number[] = [];
    public output: number = 0;

    public getOutput(): number {
        return this.stack[0];
    }

    public visitUnaryExpr(unaryExpr: UnaryExpr) {
        let signFactor = 1;

        switch (unaryExpr.opToken) {
            //case TokenType.PLUS:
            case TokenType.MINUS:
                signFactor = -1;
                break;
        }

        unaryExpr.expr.accept(this);

        let result = signFactor * this.stack.pop();

        this.stack.push(result);

        if (this.stack.length === 0) {
            this.output += result;
        }
    }


    public visitValueExpr(valueExpr: ValueExpr) {
        this.stack.push(Number(valueExpr.num));
    }

    private constTable: any = {
        'pi': Math.PI,
        'e': Math.E
    };

    public visitConstExpr(constExpr: ConstExpr) {

        let result = this.constTable[constExpr.constToken.value];

        if (result === undefined) {
            throw new Error("Undefined symbol '${constExpr.constToken.value}'.");
        }
        this.stack.push(result);

        if (this.stack.length === 0) {
            this.output += result;
        }
    }

    public visitFactorialExpr(factorialExpr: FactorialExpr) {

        factorialExpr.factor.accept(this);

        let result = this.factorial(this.stack.pop());

        this.stack.push(result);

        if (this.stack.length === 0) {
            this.output += result;
        }
    }

    private factorial(num: number): number {
        var val = 1, i = 2;
        for (; i <= num; i++)
            val = val * i;
        return val;
    }

    public visitBinaryExpr(binaryExpr: BinaryExpr) {

        binaryExpr.left.accept(this);
        let left = this.stack.pop();

        binaryExpr.right.accept(this);
        let right = this.stack.pop();

        let result = this.resolve(binaryExpr.token, left, right);

        this.stack.push(result);

        if (this.stack.length === 0) {
            this.output += result;
        }
    }

    private resolve(type: TokenType, left: number, right: number): number {
        switch (type) {
            case TokenType.PLUS:
                return left + right;
            case TokenType.MINUS:
                return left - right;
            case TokenType.DIVI:
                return left / right;
            case TokenType.MULT:
                return left * right;
            case TokenType.POW:
                return Math.pow(left, right);
            default:
                throw `Unexpected token type '${TokenType[type]}' in binary operation!`;
        }
    };
}

abstract class AST {
    public abstract accept(visitor: IASTVisitor): void;
}

class UnaryExpr extends AST {

    constructor(
        public opToken: TokenType,
        public expr: AST) {
        super();
    }

    public accept(visitor: IASTVisitor) {
        visitor.visitUnaryExpr(this);
    }
}

class ValueExpr extends AST {

    constructor(
        public num: string) {
        super();
    }

    public accept(visitor: IASTVisitor) {
        visitor.visitValueExpr(this);
    }
}

class ConstExpr extends AST {

    constructor(
        public constToken: Token) {
        super();
    }

    public accept(visitor: IASTVisitor) {
        visitor.visitConstExpr(this);
    }
}

class FactorialExpr extends AST {

    constructor(
        public factor: AST) {
        super();
    }

    public accept(visitor: IASTVisitor) {
        visitor.visitFactorialExpr(this);
    }
}

class BinaryExpr extends AST {

    constructor(
        public left: AST,
        public token: TokenType,
        public right: AST) {
        super();
    }

    public accept(visitor: IASTVisitor) {
        visitor.visitBinaryExpr(this);
    }
}

class Parser {

    public lexer: Lexer;
    public currentToken: Token;

    constructor(input: string) {
        this.lexer = new Lexer(input);
        this.currentToken = this.lexer.nextToken();
    }

    public error(msg?: string) {
        throw `Invalid syntax: ${msg}`;
    }

    public eat(tokenType: TokenType) {

        if (this.currentToken.type == tokenType) {
            this.currentToken = this.lexer.nextToken()
        } else {
            this.error(`Expect token ${TokenType[tokenType]} but got ${TokenType[this.currentToken.type]}.`)
        }
    }

    public parse(): AST {
        return this.expr();
    }

    public expr(): AST {

        // expr : term ((PLUS | MINUS) term)*

        let term = this.term();

        if (this.currentToken.type === TokenType.PLUS || this.currentToken.type === TokenType.MINUS) {


            let lTerm = term;
            let token = this.currentToken.type;
            this.eat(this.currentToken.type);
            let rTerm = this.term();

            return new BinaryExpr(lTerm, token, rTerm);
        }

        return term;
    }

    public term(): AST {

        // term : factor ((MUL | DIV | POW) term)*

        let factor = this.factor();

        // extra feature to allow 2pi, 2e and 2(2) without a multiplication operator
        if (this.currentToken.type === TokenType.NUMBER) {

            return new BinaryExpr(factor, TokenType.MULT, this.term());
        }

        if (this.currentToken.type === TokenType.MULT || this.currentToken.type === TokenType.DIVI || this.currentToken.type === TokenType.POW) {

            let lFactor = factor;
            let token = this.currentToken.type;
            this.eat(this.currentToken.type);
            let rTerm = this.term();

            return new BinaryExpr(lFactor, token, rTerm);
        }

        return factor;
    }

    public factor(): AST {

        // factor : (PLUS | MINUS) factor
        //        | FACTORIAL factor
        //        | closure
        //        | NUMBER

        if (this.currentToken.type === TokenType.PLUS || this.currentToken.type === TokenType.MINUS) {
            let opToken = this.currentToken.type;
            this.eat(this.currentToken.type);

            return new UnaryExpr(opToken, this.factor());
        }

        if (this.currentToken.type === TokenType.FACTORIAL) {
            this.eat(TokenType.FACTORIAL);
            return new FactorialExpr(this.factor());
        }

        if (this.currentToken.type === TokenType.LPAREN) {
            return this.closure();
        }

        if (this.currentToken.type === TokenType.ID) {
            return this.const();
        }

        let factor = new ValueExpr(this.currentToken.value);
        this.eat(TokenType.NUMBER);

        return factor;
    }

    public const(): AST {

        let constant = new ConstExpr(this.currentToken);
        this.eat(TokenType.ID);

        return constant;
    }

    public closure(): AST {

        //closure: LPAREN expr RPAREN

        this.eat(TokenType.LPAREN);
        let expr = this.expr();
        this.eat(TokenType.RPAREN);

        return expr;
    }
}

export default class Intepretor {

    constructor() { }

    /*
    expr : term ((PLUS | MINUS) term)*
         | closure

    closure: LPAREN expr RPAREN

    term : (PLUS | MINUS)* factor ((MUL | DIV | POW) factor)*

    factor : PLUS factor
            | MINUS factor
            | NUMBER
            | FACTORIAL NUMBER
            | LPAREN expr RPAREN
            | variable
    */

    public interpret(input: string, visitor: IASTVisitor) {
        let parser = new Parser(input);
        let rootAST = parser.parse();
        rootAST.accept(visitor);
    }
}

let interpretor = new Intepretor();


let inputElement: HTMLInputElement = <HTMLInputElement>document.getElementById('input');
let outputElement: HTMLInputElement = <HTMLInputElement>document.getElementById('output');

inputElement.addEventListener('keydown', (e) => {

    if (e.key === 'Enter') {
        let calculatorVisitor = new ASTCalculatorVisitor();

        interpretor.interpret(inputElement.value, calculatorVisitor);
        let val = calculatorVisitor.getOutput();

        let printerVisitor = new ASTPrinterVisitor();

        interpretor.interpret(inputElement.value, printerVisitor);
        let print = printerVisitor.getOutput();//printerVisitor.output;

        outputElement.innerHTML = print + ' = ' + val.toString();
    }
});