var t=[...document.querySelectorAll("video")];for(let o of t)o.addEventListener("play",()=>{for(let e of t)e!==o&&e.pause()});
