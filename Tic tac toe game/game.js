let boxes = document.querySelectorAll('.box');
let reset = document.querySelector('#reset');
let newGameBtn = document.querySelector('#new-game');
let msgContainer = document.querySelector('.msg-conatainer');
let msg = document.querySelector('#msg');
let turn0 = true;

let winPatterns = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
];

const resetGame = () => {
    turn0 = true;
    enableBoxes();
    msgContainer.classList.add('hide');
}

boxes.forEach((box) => {
    box.addEventListener('click', () => {
        if (turn0) {
            //player 0's turn
            box.innerText = "O";
            turn0 = false;
        } else {
            //player 1's turn
            box.innerText = "X";
            turn0 = true;
        }
        box.disabled = true;
        checkWinner();
    });
});

let disableBoxes = () => {
    for (let box of boxes) {
        box.disabled = true;
    }
};

let enableBoxes = () => {
    for (let box of boxes) {
        box.disabled = false;
        box.innerText = "";
    }
};

showWinner = (winner) => {
    msg.innerText = `${winner} wins the game!`;
    msgContainer.classList.remove('hide');
    disableBoxes();
};

checkWinner = () => {
    winPatterns.forEach(() => {
        for (let pattern of winPatterns) {
            let posVal1 = boxes[pattern[0]].innerText;
            let posVal2 = boxes[pattern[1]].innerText;
            let posVal3 = boxes[pattern[2]].innerText;

            if (posVal1 != "" && posVal1 == posVal2 && posVal2 == posVal3) {
                showWinner(posVal1);
            }
        }
    });
}

reset.addEventListener('click', resetGame);
newGameBtn.addEventListener('click', resetGame);