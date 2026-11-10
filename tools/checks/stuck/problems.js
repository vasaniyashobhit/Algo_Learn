/** Statements of real Codeforces problems used by `npm run check:stuck` (one per input type). */

// (a) pasted text: 71A Way Too Long Words
export const WAY_TOO_LONG_WORDS = `A. Way Too Long Words
Sometimes some words like "localization" or "internationalization" are so long that writing them many times in one text is quite tiresome.
Let's consider a word too long, if its length is strictly more than 10 characters. All too long words should be replaced with a special abbreviation.
This abbreviation is made like this: we write down the first and the last letter of a word and between them we write the number of letters between the first and the last letters. That number is in decimal system and doesn't contain any leading zeroes.
Thus, "localization" will be spelt as "l10n", and "internationalization" will be spelt as "i18n".
You are suggested to automatize the process of changing the words with abbreviations. At that all too long words should be replaced by the abbreviation and the words that are not too long should not undergo any changes.
Input: The first line contains an integer n (1 <= n <= 100). Each of the following n lines contains one word. All the words consist of lowercase Latin letters and possess the lengths of from 1 to 100 characters.
Output: Print n lines. The i-th line should contain the result of replacing of the i-th word from the input data.`;

// (b) URL: 4A Watermelon
export const WATERMELON_URL = 'https://codeforces.com/problemset/problem/4/A';

// (c) PDF: 231A Team
export const TEAM = `A. Team
One day three best friends Petya, Vasya and Tonya decided to form a team and take part in programming contests. Participants are usually offered several problems during programming contests. Long before the start the friends decided that they will implement a problem if at least two of them are sure about the solution. Otherwise, the friends won't write the problem's solution.
This contest offers n problems to the participants. For each problem we know, which friend is sure about the solution. Help the friends find the number of problems for which they will write a solution.
Input: The first input line contains a single integer n (1 <= n <= 1000) - the number of problems in the contest. Then n lines contain three integers each, each integer is either 0 or 1. If the first number in the line equals 1, then Petya is sure about the problem's solution, otherwise he isn't sure. The second number shows Vasya's view on the solution, the third number shows Tonya's view.
Output: Print a single integer - the number of problems the friends will implement on the contest.`;

// (d) PNG screenshot: 1A Theatre Square
export const THEATRE_SQUARE = `A. Theatre Square
Theatre Square in the capital city of Berland has a rectangular shape with the size n x m meters. On the occasion of the city's anniversary, a decision was taken to pave the Square with square granite flagstones. Each flagstone is of the size a x a.
What is the least number of flagstones needed to pave the Square? It's allowed to cover the surface larger than the Theatre Square, but the Square has to be covered. It's not allowed to break the flagstones. The sides of flagstones should be parallel to the sides of the Square.
Input: The input contains three positive integer numbers in the first line: n, m and a (1 <= n, m, a <= 10^9).
Output: Write the needed number of flagstones.`;
