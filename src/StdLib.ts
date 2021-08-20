/* FILENAME:    StdLib.ts
 * DESCRIPTION: 
 *      This file defines the code text for each block
 * DATE:    08/19/2021
 * AUTHOR:      Aaron Bauer
 */
export const StdLibText = `
define Forward(x)
    repeat x times
        command forward()

define Left()
    command left()

define Right()
    command right()

define Up(x)
    repeat x times
        command up()

define Down(x)
    repeat x times
        command down()

define PlaceCube(color)
    command cube(color)

define RemoveCube()
    command remove()
`;