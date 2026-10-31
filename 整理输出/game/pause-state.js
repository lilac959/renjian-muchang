// User/environment pauses survive temporary UI overlays.
export class PauseState {
  constructor(){this.manual=false;this.layers=new Set();}
  get paused(){return this.manual||this.layers.size>0;}
  reset(manual=false){this.manual=manual;this.layers.clear();}
  open(layer){this.layers.add(layer);}
  close(layer){this.layers.delete(layer);}
  suspend(){this.manual=true;}
  toggle(){if(!this.layers.size)this.manual=!this.manual;}
}
