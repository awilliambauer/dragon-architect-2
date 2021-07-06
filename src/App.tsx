import BlocklyComp, { print_blocks } from './BlocklyComp';
// import Display from './Display';

// TODO convert App to a class, it's where the game's 
// global state will be stored
function App() {
  return (
    <div className="App">
      {/* Navigation bar */}
      {/* Code area
            Blockly
            Control buttons  */}
      <button onClick={()=>print_blocks()}/>
      <BlocklyComp/>
      {/* <Display/> */}
      {/* Game area
            Camera controls
            3D view
            Other controls
            Instructions   */}
    </div>
  );
}

export default App;
