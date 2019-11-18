(function () {
    const voteList = ('PK FK KZ KF K KF K K K K K K K K K K G GK GK GP G GZ G GZ GZ G GK GZ G G G G G G G G G ' +
        'G G G G GZ GZ GK GH G GZ G GK PG ZG ZG ZG KG KG KG GP G GK GP GF GK F F F F F F F F FZ ZF PF PF Z ZP ' +
        'ZH PZ HZ HZ Z P HP N N S S A')
        .split(' ')
        .filter(t => t !== 'A' && t !== 'S')
        .sort((a, b) => (a.length - b.length) || (a > b ? 1 : a < b ? -1 : 0))
        .map(v => v.split(''));
    const ballotCount = voteList.length;
    const endorsementThreshold = ballotCount * 2 / 3;
    const candidateNames = {
        F: 'Fanning',
        G: 'Grossman',
        H: 'Hernandez',
        K: 'Kennedy',
        P: 'Putta',
        Z: 'Zhang',
        N: 'No endorsement',
    };
    const colors = ['#fb8072', '#8dd3c7', '#ffffb3', '#80b1d3', '#bebada', '#fdb462'];
    const candidates = {};
    const boxHeight = 16;
    const boxWidth = boxHeight;
    const svg = makeSvgNode(
        'svg',
        {viewBox: '0,0 1000,300', width: '100%'},
        document.getElementById('figure-container')
    );
    const styleNode = makeSvgNode('style', {}, svg, '');

    class VoteBox {

        constructor(votes, pos) {
            const g = makeSvgNode(
                'g',
                {transform: `translate(${pos[0]},${pos[1]})`},
                svg
            );
            if (votes.length === 2) {
                makeSvgNode(
                    'polygon',
                    {
                        points: `0,0 ${boxWidth},0 0,${boxHeight}`,
                        class: votes[0],
                    },
                    g
                );
                makeSvgNode(
                    'polygon',
                    {
                        points: `${boxWidth},0 ${boxWidth},${boxHeight} 0,${boxHeight}`,
                        class: votes[1],
                    },
                    g
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.25 * boxWidth,
                        y: 0.45 * boxHeight,
                        class: 'letter',
                    },
                    g,
                    votes[0]
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.75 * boxWidth,
                        y: 0.85 * boxHeight,
                        class: 'letter',
                    },
                    g,
                    votes[1]
                );
            }
            else {
                makeSvgNode(
                    'rect',
                    {
                        width: boxWidth,
                        height: boxHeight,
                        class: votes[0],
                    },
                    g
                );
                makeSvgNode(
                    'text',
                    {
                        x: 0.5 * boxWidth,
                        y: 0.65 * boxHeight,
                        class: 'letter',
                    },
                    g,
                    votes[0]
                );
            }
            makeSvgNode(
                'rect',
                {
                    width: boxWidth,
                    height: boxHeight,
                    class: 'border',
                },
                g
            );
            this.votes = votes;
            this.node = g;
            this.pos = pos;
            this.voteIndex = 0;
        }

        currentChoice() {
            return this.votes[this.voteIndex];
        }

        useNextChoice() {
            this.voteIndex++;
            return this.currentChoice();
        }

        secondChoice() {
            return this.votes[1];
        }

        moveTo(to) {
            const from = [this.pos[0], this.pos[1]];
            const time = 500;
            const steps = Math.round(time / 40);
            const that = this;
            return new Promise(function (resolve) {
                for (let i = 0; i < steps; i++) {
                    const frac = easing((i + 1) / steps);
                    const x = from[0] + frac * (to[0] - from[0]);
                    const y = from[1] + frac * (to[1] - from[1]);
                    setTimeout(
                        function () {
                            that.pos = [x, y];
                            that.node.setAttribute('transform', `translate(${x},${y})`);
                            if (frac >= 1) {
                                resolve();
                            }
                        },
                        frac * time
                    );
                }
            });

            function easing(t) {
                return 1 - Math.pow(1 - t, 3);
            }
        }

    }

    class Candidate {

        constructor(abbr) {
            this.abbr = abbr;
            this.count = 0;
            this.boxes = [];
            this.name = candidateNames[this.abbr];
            this.color = this.abbr === 'N' ? '#888888' : colors.shift();
            this.index = Object.keys(candidates).length;
            this.nameNode = this.makeNameNode();
            this.countNode = this.makeCountNode();
            candidates[this.abbr] = this;
        }

        addBox(votes) {
            const pos = [this.nextBoxX(), this.nextBoxY()];
            this.incrementCount();
            let box;
            let promise;
            if (votes instanceof VoteBox) {
                box = votes;
                promise = box.moveTo(pos);
            }
            else {
                box = new VoteBox(votes, pos);
                promise = Promise.resolve();
            }
            this.boxes.push(box);
            return promise;
        }

        removeBox(box) {
            this.boxes = this.boxes.filter(b => b !== box);
            this.decrementCount();
        }

        nextBoxX() {
            return 7.6 * boxHeight + this.count * 1.1 * boxWidth;
        }

        nextBoxY() {
            return 5 + this.index * 2 * boxHeight;
        }

        makeNameNode() {
            return makeSvgNode(
                'text',
                {
                    x: 5.8 * boxHeight, // approx length of "No endorsement" plus a little padding
                    y: this.nextBoxY() + 0.8 * boxHeight,
                    class: 'name',
                },
                svg,
                this.name
            );
        }

        makeCountNode() {
            return makeSvgNode(
                'text',
                {
                    x: 7.1 * boxHeight,
                    y: this.nextBoxY() + 0.8 * boxHeight,
                    class: 'count',
                },
                svg,
                this.count.toString()
            );
        }

        incrementCount(amount = 1) {
            this.count += amount;
            this.updateCount();
        }

        decrementCount(amount = 1) {
            this.incrementCount(-amount);
        }

        updateCount() {
            this.countNode.innerHTML = this.count;
        }

        eliminated() {
            return this.count === 0;
        }

    }

    Object.keys(candidateNames).forEach(abbr => candidates[abbr] = new Candidate(abbr));
    insertStyle();
    voteList.forEach(votes => candidates[votes[0]].addBox(votes));
    const result = writeExplanation();
    if (result === true) {
        document.getElementById('play-button').addEventListener('click', () => doRounds(false));
        document.getElementById('forward-button').addEventListener('click', () => doRounds(true));
    }
    else {
        document.getElementById('play-button').disabled = true;
        document.getElementById('forward-button').disabled = true;
    }

    function doRounds(keepGoing) {
        document.getElementById('play-button').disabled = true;
        document.getElementById('forward-button').disabled = true;
        const sortedCandidates = Object.values(candidates)
            .filter(c => c.abbr !== 'N' && c.count > 0)
            .sort((a, b) => a.count - b.count);
        const bottomCandidate = sortedCandidates.shift();
        document.getElementById('explanation1').innerHTML =
            `${bottomCandidate.name} is eliminated, and each of those ${bottomCandidate.count}
            votes is transferred to the second-choice candidate for that ballot. If there is no second choice, or
            if the second choice has already been eliminated, the vote is transferred to "No endorsement".`;
        document.getElementById('explanation2').innerHTML = '';
        const boxesToMove = [...bottomCandidate.boxes].reverse();
        const boxGroups = [];
        let prev = '';
        boxesToMove.forEach(function (box) {
            if (prev !== box.secondChoice()) {
                boxGroups.push([]);
            }
            boxGroups[boxGroups.length - 1].unshift(box);
            prev = box.secondChoice();
        });
        const tasks = boxGroups.map(function (boxGroup) {
            return function () {
                const promises = boxGroup.map(function (box) {
                    bottomCandidate.removeBox(box);
                    let toCandidate = candidates[box.useNextChoice() || 'N'];
                    if (toCandidate.eliminated()) {
                        toCandidate = candidates['N'];
                    }
                    return toCandidate.addBox(box);
                });
                return Promise.all(promises);
            };
        });
        return tasks.reduce(
            (promiseChain, currentTask) => promiseChain = promiseChain.then(currentTask),
            Promise.resolve()
        )
            .then(function () {
                const result = writeExplanation();
                if (result !== true) {
                    return result;
                }
                if (keepGoing) {
                    return new Promise(function (resolve) {
                        setTimeout(() => resolve(doRounds(true)), 500);
                    });
                }
                document.getElementById('play-button').disabled = false;
                document.getElementById('forward-button').disabled = false;
                return true;
            });
    }

    function writeExplanation() {
        const sortedCandidates = Object.values(candidates)
            .filter(c => c.abbr !== 'N' && c.count > 0)
            .sort((a, b) => b.count - a.count);
        const topCandidate = sortedCandidates[0];
        const winner = topCandidate.count >= endorsementThreshold ? topCandidate : null;
        const explanation2 = document.getElementById('explanation2');
        const percent = (100 * topCandidate.count / ballotCount).toFixed(2);
        explanation2.innerHTML =
            `${topCandidate.name} has ${topCandidate.count} votes, or ${percent}%, ` +
            (winner ? 'and has reached' : 'short of') +
            ` the two thirds (${Math.ceil(endorsementThreshold)} votes) needed for endorsement. `;
        if (winner || sortedCandidates.length < 2) {
            explanation2.innerHTML += winner
                ? `<strong>${topCandidate.name} is endorsed.</strong>`
                : 'No candidates are left to be eliminated. <strong>There is no endorsement.</strong>';
            return winner;
        }
        const candidatesEliminated = Object.keys(candidates).length - 1 - sortedCandidates.length;
        explanation2.innerHTML += candidatesEliminated
            ? 'The process continues.'
            : 'Second votes must be examined. Click a button to do one step or the entire process.';
        return true;
    }

    function insertStyle() {
        let styleContent = '';
        Object.values(candidates).forEach(c => styleContent += `.${c.abbr} { fill: ${c.color} }\n`);
        styleContent += `.letter { font-size: ${0.45 * boxHeight}px; fill: black; text-anchor: middle }\n` +
            `.name { font-size: ${0.75 * boxHeight}px; fill: black; text-anchor: end }\n` +
            `.count { font-size: ${0.75 * boxHeight}px; fill: blue; text-anchor: end }\n` +
            `.border { stroke-width: ${boxHeight / 25}px; stroke: #bbbbbb; fill: transparent; }\n`;
        styleNode.innerHTML = styleContent;
    }

    function makeSvgNode(name, attr, parent, child) {
        const node = document.createElementNS('http://www.w3.org/2000/svg', name);
        if (!attr) {
            attr = {};
        }
        Object.keys(attr).forEach(function (key) {
            node.setAttribute(key, attr[key]);
        });
        if (child) {
            node.appendChild(document.createTextNode(child));
        }
        if (parent) {
            parent.appendChild(node);
        }
        return node;
    }
})();
