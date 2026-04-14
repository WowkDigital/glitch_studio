
export class TransactionManager {
  constructor(initialState, onStateChange) {
    this.history = [this.clone(initialState)];
    this.pointer = 0;
    this.maxHistory = 50;
    this.onStateChange = onStateChange;
  }

  clone(state) {
    return JSON.parse(JSON.stringify(state));
  }

  push(state) {
    // If we're not at the end of the history (i.e. user did undo), truncate it
    if (this.pointer < this.history.length - 1) {
      this.history = this.history.slice(0, this.pointer + 1);
    }

    const newState = this.clone(state);
    
    // Don't push if state is same as current (redundant)
    if (JSON.stringify(this.history[this.pointer]) === JSON.stringify(newState)) {
        return;
    }

    this.history.push(newState);
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.pointer++;
    }
    
    this.updateUI();
  }

  undo() {
    if (this.pointer > 0) {
      this.pointer--;
      this.onStateChange(this.clone(this.history[this.pointer]));
      this.updateUI();
      return true;
    }
    return false;
  }

  redo() {
    if (this.pointer < this.history.length - 1) {
      this.pointer++;
      this.onStateChange(this.clone(this.history[this.pointer]));
      this.updateUI();
      return true;
    }
    return false;
  }

  updateUI() {
    const undoBtn = document.getElementById('undo-btn');
    const redoBtn = document.getElementById('redo-btn');
    if (undoBtn) undoBtn.disabled = this.pointer === 0;
    if (redoBtn) redoBtn.disabled = this.pointer === this.history.length - 1;
    
    // Optional: Visual feedback of history state
    const counter = document.getElementById('history-counter');
    if (counter) counter.textContent = `${this.pointer + 1}/${this.history.length}`;
  }
}
