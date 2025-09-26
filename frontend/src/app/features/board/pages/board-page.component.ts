import { Component, OnInit, AfterViewInit, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BoardService } from '../data-access/board.service';
import { BoardDiagram, ClassNode, RelationEdge, Attribute } from '../models/board.model';
import { BoardGeneratorService } from '../services/board-generator.service';

@Component({
  selector: 'app-board-page',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="board-container" [class.dark-theme]="darkMode">
      <div class="board-header">
        <h2>Diagramador UML</h2>
        <div class="theme-toggle">
          <button class="theme-button" (click)="toggleTheme()">
            {{ darkMode ? '☀️' : '🌙' }}
          </button>
        </div>
      </div>
      
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="tool-button primary" (click)="sync()" title="Actualizar">
            <span class="icon">🔄</span> Actualizar
          </button>
          <button class="tool-button primary" (click)="gen()" title="Generar código">
            <span class="icon">💾</span> Generar
          </button>
        </div>
        
        <div class="toolbar-group">
          <button class="tool-button" (click)="addClass()" title="Añadir clase">
            <span class="icon">➕</span> Clase
          </button>
          <button class="tool-button" (click)="undo()" [disabled]="!history.length" title="Deshacer">
            <span class="icon">⏪</span> Deshacer
          </button>
          <button class="tool-button" (click)="redo()" [disabled]="!redoStack.length" title="Rehacer">
            <span class="icon">⏩</span> Rehacer
          </button>
        </div>
        
        <div class="toolbar-group">
          <button class="tool-button" (click)="autoAlign()" title="Alinear clases automáticamente">
            <span class="icon">🔲</span> Alinear
          </button>
          <button class="tool-button" (click)="zoom(1.2)" title="Acercar">
            <span class="icon">➕</span> Zoom
          </button>
          <button class="tool-button" (click)="zoom(0.8)" title="Alejar">
            <span class="icon">➖</span> Zoom
          </button>
        </div>
      </div>

      <div class="board-wrapper">
        <svg
          #svg
          width="100%"
          height="700"
          (mousemove)="move($event)"
          (mouseup)="up()"
          (mouseleave)="up()"
        >
          <!-- Grid background -->
          <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke="var(--grid-color)" stroke-width="0.5"/>
          </pattern>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          <!-- Líneas de relaciones -->
          <g *ngFor="let r of d.relations; let i = index">
            <line
              [attr.x1]="x1(r,i)"
              [attr.y1]="y1(r,i)"
              [attr.x2]="x2(r,i)"
              [attr.y2]="y2(r,i)"
              stroke="var(--relation-color)"
              [attr.stroke-dasharray]="r.type==='dependency'?'5,5':null"
              stroke-width="2"
            ></line>

            <g *ngIf="r.type === 'inheritance' || r.type === 'Herencia'"
               [attr.transform]="'translate(' + x2(r,i) + ',' + y2(r,i) + ') rotate(' + angle(r,i) + ')'">
              <polygon points="0,0 -14,-7 -14,7" fill="var(--bg-color)" stroke="var(--relation-color)" stroke-width="2"></polygon>
            </g>

            <g *ngIf="r.type === 'composition' || r.type === 'Composicion'"
               [attr.transform]="'translate(' + x1(r,i) + ',' + y1(r,i) + ') rotate(' + angle(r,i) + ')'">
              <polygon points="0,0 10,-5 20,0 10,5" fill="var(--relation-color)" stroke="var(--relation-color)" stroke-width="1"></polygon>
            </g>

            <g *ngIf="r.type === 'aggregation' || r.type === 'Agregacion'"
               [attr.transform]="'translate(' + x1(r,i) + ',' + y1(r,i) + ') rotate(' + angle(r,i) + ')'">
              <polygon points="0,0 10,-5 20,0 10,5" fill="var(--bg-color)" stroke="var(--relation-color)" stroke-width="1"></polygon>
            </g>

            <g *ngIf="r.type === 'dependency' || r.type === 'Dependencia'"
               [attr.transform]="'translate(' + x2(r,i) + ',' + y2(r,i) + ') rotate(' + angle(r,i) + ')'">
              <polyline points="0,0 -10,-5 0,0 -10,5" fill="none" stroke="var(--relation-color)" stroke-width="2"></polyline>
            </g>
          </g>

          <!-- Clases -->
          <g
            *ngFor="let n of d.classes"
            class="uml-class"
            [attr.transform]="'translate(' + n.x + ',' + n.y + ')'"
            (mousedown)="down($event, n)"
            (click)="click(n, $event)"
          >
            <!-- Class background -->
            <rect [attr.width]="classWidth" 
                  [attr.height]="50 + n.attributes.length * 20" 
                  fill="var(--class-bg)" 
                  stroke="var(--class-border)" 
                  rx="4"
                  [attr.stroke-width]="n === selectedClass ? 2 : 1" />
            
            <!-- Class header -->
            <rect [attr.width]="classWidth" 
                  height="30" 
                  fill="var(--header-bg)" 
                  stroke="var(--class-border)" 
                  rx="4 4 0 0" />
            
            <!-- Class name input -->
            <foreignObject [attr.width]="classWidth" height="30">
              <input 
                [(ngModel)]="n.name" 
                style="width:100%; text-align:center;" 
                [class]="'class-input ' + (darkMode ? 'dark' : '')" />
            </foreignObject>

            <!-- Attributes -->
            <ng-container *ngFor="let a of n.attributes; let i = index">
              <foreignObject [attr.y]="30 + i * 20" [attr.width]="classWidth" height="20">
                <div class="attr-row" [class.dark]="darkMode">
                  <select [(ngModel)]="a.scope" class="scope-select" [class.dark]="darkMode">
                    <option value="+">+</option>
                    <option value="-">-</option>
                    <option value="#">#</option>
                  </select>
                  <input [(ngModel)]="a.name" placeholder="Nombre" class="attr-name" [class.dark]="darkMode" />
                  <select [(ngModel)]="a.type" class="attr-type" [class.dark]="darkMode">
                    <option *ngFor="let t of types" [value]="t">{{ t }}</option>
                  </select>
                </div>
              </foreignObject>
            </ng-container>

            <!-- Class actions -->
            <foreignObject [attr.y]="30 + n.attributes.length * 20" [attr.width]="classWidth" height="80" class="action-buttons">
              <div class="class-actions" [class.dark]="darkMode">
                <button (click)="saveHistory(); n.attributes.push({ name: '', type: 'String', scope: '+' })" class="action-btn add-attr">
                  <span class="icon-small">➕</span> Atributo
                </button>
                <button (click)="saveHistory(); remClass(n)" class="action-btn remove-class">
                  <span class="icon-small">🗑️</span> Eliminar
                </button>
                <button (click)="saveHistory(); startRel(n)" class="action-btn add-rel">
                  <span class="icon-small">🔗</span> Relación
                </button>
                <button (click)="duplicateClass(n)" class="action-btn duplicate">
                  <span class="icon-small">📄</span> Duplicar
                </button>
              </div>
            </foreignObject>
          </g>

          <!-- Multiplicidades y eliminar relación -->
          <g *ngFor="let r of d.relations; let i = index">
            <!-- Multiplicidad origen -->
            <text [attr.x]="multX(r, i, 'origin')" 
                  [attr.y]="multY(r, i, 'origin')" 
                  font-size="12" 
                  fill="var(--text-color)"
                  text-anchor="middle" 
                  alignment-baseline="middle">{{ r.originMultiplicity }}</text>
            
            <!-- Multiplicidad destino -->
            <text [attr.x]="multX(r, i, 'target')" 
                  [attr.y]="multY(r, i, 'target')" 
                  font-size="12"
                  fill="var(--text-color)"
                  text-anchor="middle" 
                  alignment-baseline="middle">{{ r.targetMultiplicity }}</text>
            
            <!-- Botón eliminar relación -->
            <foreignObject [attr.x]="(x1(r,i)+x2(r,i))/2 - 10" 
                           [attr.y]="(y1(r,i)+y2(r,i))/2 - 10" 
                           width="20" 
                           height="20">
              <button (click)="saveHistory(); remRel(r)" class="delete-relation" [class.dark]="darkMode">×</button>
            </foreignObject>
          </g>

          <!-- Menú relación -->
          <foreignObject *ngIf="relO && menu" 
                        [attr.x]="relO.x + classWidth + 10" 
                        [attr.y]="relO.y" 
                        width="180" 
                        height="190">
            <div class="relation-menu" [class.dark]="darkMode">
              <h4 class="relation-title">Tipo de relación</h4>
              <button *ngFor="let t of relationTypes" 
                      (click)="saveHistory(); setType(t)" 
                      class="relation-option">{{ t }}</button>
              <button (click)="cancel()" class="relation-cancel">Cancelar</button>
            </div>
          </foreignObject>
        </svg>
      </div>
    </div>
  `,
  styles: [`
    /* Variables para temas claro y oscuro */
    :host {
      --bg-color: #ffffff;
      --text-color: #333333;
      --header-bg: #f8f9fa;
      --toolbar-bg: #f0f0f0;
      --class-bg: #ffffff;
      --class-border: #2c3e50;
      --class-shadow: rgba(0, 0, 0, 0.1);
      --grid-color: rgba(0, 0, 0, 0.1);
      --button-primary: #3498db;
      --button-primary-hover: #2980b9;
      --button-secondary: #ecf0f1;
      --button-secondary-hover: #bdc3c7;
      --button-text: #ffffff;
      --button-text-secondary: #333333;
      --relation-color: #2c3e50;
      --relation-menu-bg: #ffffff;
      --input-bg: #ffffff;
      --input-border: #dcdcdc;
      --border-radius: 5px;
    }

    .dark-theme {
      --bg-color: #1e1e2f;
      --text-color: #e4e6eb;
      --header-bg: #252538;
      --toolbar-bg: #252538;
      --class-bg: #2d2d44;
      --class-border: #6c7ac9;
      --class-shadow: rgba(0, 0, 0, 0.3);
      --grid-color: rgba(255, 255, 255, 0.05);
      --button-primary: #6c7ac9;
      --button-primary-hover: #8692e0;
      --button-secondary: #383854;
      --button-secondary-hover: #45455e;
      --button-text: #ffffff;
      --button-text-secondary: #e4e6eb;
      --relation-color: #6c7ac9;
      --relation-menu-bg: #2d2d44;
      --input-bg: #383854;
      --input-border: #45455e;
    }

    .board-container {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background-color: var(--bg-color);
      color: var(--text-color);
      transition: all 0.3s ease;
      padding: 16px;
      min-height: 100vh;
    }

    .board-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }

    .board-header h2 {
      font-weight: 600;
      font-size: 24px;
      margin: 0;
    }

    .theme-button {
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      padding: 8px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      background-color: var(--button-secondary);
      transition: all 0.3s ease;
    }

    .theme-button:hover {
      background-color: var(--button-secondary-hover);
    }

    .toolbar {
      display: flex;
      gap: 16px;
      padding: 12px 16px;
      background-color: var(--toolbar-bg);
      border-radius: var(--border-radius);
      margin-bottom: 16px;
      flex-wrap: wrap;
      box-shadow: 0 2px 5px var(--class-shadow);
    }

    .toolbar-group {
      display: flex;
      gap: 8px;
    }

    .tool-button {
      background-color: var(--button-secondary);
      color: var(--button-text-secondary);
      border: none;
      padding: 8px 12px;
      border-radius: var(--border-radius);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      font-size: 14px;
      box-shadow: 0 1px 3px var(--class-shadow);
    }

    .tool-button:hover {
      background-color: var(--button-secondary-hover);
    }

    .tool-button.primary {
      background-color: var(--button-primary);
      color: var(--button-text);
    }

    .tool-button.primary:hover {
      background-color: var(--button-primary-hover);
    }

    .tool-button .icon {
      margin-right: 6px;
    }

    .board-wrapper {
      border: 1px solid var(--class-border);
      border-radius: var(--border-radius);
      overflow: hidden;
      box-shadow: 0 4px 8px var(--class-shadow);
      background-color: var(--bg-color);
    }

    svg {
      background-color: var(--bg-color);
      display: block;
    }

    .uml-class .action-buttons { 
      opacity: 0; 
      transition: opacity 0.3s ease; 
      pointer-events: none; 
    }
    
    .uml-class:hover .action-buttons { 
      opacity: 1; 
      pointer-events: all; 
    }

    .class-input {
      border: none;
      background: transparent;
      outline: none;
      font-weight: bold;
      color: var(--text-color);
      height: 28px;
      padding: 0 8px;
      text-align: center;
      width: 100%;
    }

    .class-input.dark {
      color: var(--text-color);
      background-color: transparent;
    }

    .attr-row {
      display: flex;
      gap: 2px;
      width: 100%;
      background-color: var(--class-bg);
      height: 20px;
    }

    .attr-row.dark {
      background-color: var(--class-bg);
    }

    .scope-select, .attr-name, .attr-type {
      appearance: none;
      border: none;
      background: transparent;
      outline: none;
      color: var(--text-color);
      padding-left: 4px;
    }

    .scope-select.dark, .attr-name.dark, .attr-type.dark {
      color: var(--text-color);
      background-color: transparent;
    }

    .scope-select {
      width: 20%;
    }

    .attr-name {
      width: 40%;
    }

    .attr-type {
      width: 40%;
    }

    .class-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      padding: 4px;
    }

    .class-actions.dark {
      background-color: var(--class-bg);
    }

    .action-btn {
      flex: 1 0 calc(50% - 4px);
      border: none;
      background-color: var(--button-secondary);
      color: var(--button-text-secondary);
      padding: 4px;
      cursor: pointer;
      font-size: 12px;
      border-radius: 3px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: background-color 0.2s;
    }

    .action-btn:hover {
      background-color: var(--button-secondary-hover);
    }

    .icon-small {
      margin-right: 4px;
      font-size: 12px;
    }

    .delete-relation {
      width: 100%;
      height: 100%;
      border: none;
      background-color: var(--button-secondary);
      color: var(--button-text-secondary);
      border-radius: 50%;
      cursor: pointer;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: opacity 0.2s;
    }

    .delete-relation.dark {
      background-color: var(--button-secondary);
      color: var(--button-text-secondary);
    }

    .delete-relation:hover {
      opacity: 1;
    }

    .relation-menu {
      display: flex;
      flex-direction: column;
      gap: 4px;
      background-color: var(--relation-menu-bg);
      border-radius: var(--border-radius);
      padding: 8px;
      box-shadow: 0 4px 8px var(--class-shadow);
      border: 1px solid var(--class-border);
    }

    .relation-menu.dark {
      background-color: var(--relation-menu-bg);
    }

    .relation-title {
      margin: 0 0 8px 0;
      font-size: 14px;
      text-align: center;
      color: var(--text-color);
    }

    .relation-option {
      padding: 6px 8px;
      border: none;
      background-color: var(--button-secondary);
      color: var(--button-text-secondary);
      cursor: pointer;
      border-radius: 3px;
      transition: background-color 0.2s;
    }

    .relation-option:hover {
      background-color: var(--button-secondary-hover);
    }

    .relation-cancel {
      margin-top: 8px;
      padding: 6px 8px;
      border: none;
      background-color: var(--button-primary);
      color: var(--button-text);
      cursor: pointer;
      border-radius: 3px;
    }

    .relation-cancel:hover {
      background-color: var(--button-primary-hover);
    }
  `],
})
export class BoardPageComponent implements OnInit, AfterViewInit {
  @ViewChild('svg') svgElement!: ElementRef;
  
  d: BoardDiagram = { classes: [], relations: [] };
  types: Attribute['type'][] = ['String', 'Integer', 'Real', 'Boolean', 'Date'];
  relationTypes: RelationEdge['type'][] = ['association', 'inheritance', 'composition', 'aggregation', 'dependency'];
  //relationTypes: RelationEdge['type'][] = ['Asociacion', 'Herencia', 'Composicion', 'Agregacion', 'Dependencia'];
  drag: ClassNode | null = null;
  offX = 0;
  offY = 0;
  svg!: SVGSVGElement;
  relO: ClassNode | null = null;
  type: RelationEdge['type'] | null = null;
  menu = false;
  gap = 70;
  classWidth = 200;
  multOffset = 10;
  multFactor = 0.15;
  zoomLevel = 1;
  darkMode = false;
  selectedClass: ClassNode | null = null;

  history: BoardDiagram[] = [];
  redoStack: BoardDiagram[] = [];

  constructor(
    private s: BoardService,
    private generator: BoardGeneratorService
  ) {}

  ngOnInit() {
    // Cargar preferencia de tema
    const savedTheme = localStorage.getItem('umlo-theme');
    if (savedTheme === 'dark') {
      this.darkMode = true;
    } else if (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      this.darkMode = true;
    }

    this.s.getDiagram().subscribe(di => this.d = di);
    this.s.updateDiagram({
      classes: [
        { id: '1', name: 'Usuario', attributes: [{ name: 'id', type: 'Integer', scope: '+' }, { name: 'email', type: 'String', scope: '+' }], x: 100, y: 100 },
        { id: '2', name: 'Producto', attributes: [{ name: 'id', type: 'Integer', scope: '+' }, { name: 'precio', type: 'Real', scope: '+' }], x: 300, y: 200 },
      ],
      relations: [],
    });
  }

  ngAfterViewInit() { 
    this.svg = this.svgElement.nativeElement; 
  }

  toggleTheme() {
    this.darkMode = !this.darkMode;
    localStorage.setItem('umlo-theme', this.darkMode ? 'dark' : 'light');
  }

  n = (id: string) => this.d.classes.find(c => c.id === id)!;
  sync = () => this.s.updateDiagram(this.d).subscribe();

  // ⚡ Método de generación Spring Boot
  gen() {
    this.generator.generateSpringBootProject(this.d);
  }

  saveHistory() {
    this.history.push(JSON.parse(JSON.stringify(this.d)));
    this.redoStack = [];
  }

  undo() {
    if (!this.history.length) return;
    this.redoStack.push(JSON.parse(JSON.stringify(this.d)));
    this.d = this.history.pop()!;
  }

  redo() {
    if (!this.redoStack.length) return;
    this.history.push(JSON.parse(JSON.stringify(this.d)));
    this.d = this.redoStack.pop()!;
  }

  autoAlign() {
    this.saveHistory();
    this.d.classes.forEach((c,i) => {
      c.x = 50 + (i%5)*(this.classWidth + 50);
      c.y = 50 + Math.floor(i/5)*150;
    });
  }

  duplicateClass(n: ClassNode) {
    this.saveHistory();
    const id = (Math.max(0,...this.d.classes.map(c => +c.id)) + 1).toString();
    this.d.classes.push({ ...JSON.parse(JSON.stringify(n)), id, x: n.x + 20, y: n.y + 20 });
  }

  zoom(factor: number) {
    this.zoomLevel *= factor;
    this.svg.setAttribute('viewBox', `0 0 ${1200/this.zoomLevel} ${700/this.zoomLevel}`);
  }

  private edgePoint(n: ClassNode, tx: number, ty: number) {
    const w = this.classWidth, h = 50 + n.attributes.length * 20;
    const cx = n.x + w/2, cy = n.y + h/2;
    const dx = tx - cx, dy = ty - cy;
    if(dx===0) return { x: cx, y: dy>0 ? n.y + h : n.y };
    if(dy===0) return { x: dx>0 ? n.x + w : n.x, y: cy };
    const scale = Math.min(Math.abs((dx>0?w/2:-w/2)/dx), Math.abs((dy>0?h/2:-h/2)/dy));
    return { x: cx + dx*scale, y: cy + dy*scale };
  }

  x1 = (r: RelationEdge, i:number) => this.edgePoint(this.n(r.originId), this.n(r.targetId).x + this.classWidth/2, this.n(r.targetId).y + (50 + this.n(r.targetId).attributes.length*20)/2 + i*this.gap).x;
  y1 = (r: RelationEdge, i:number) => this.edgePoint(this.n(r.originId), this.n(r.targetId).x + this.classWidth/2, this.n(r.targetId).y + (50 + this.n(r.targetId).attributes.length*20)/2 + i*this.gap).y;
  x2 = (r: RelationEdge, i:number) => this.edgePoint(this.n(r.targetId), this.n(r.originId).x + this.classWidth/2, this.n(r.originId).y + (50 + this.n(r.originId).attributes.length*20)/2 + i*this.gap).x;
  y2 = (r: RelationEdge, i:number) => this.edgePoint(this.n(r.targetId), this.n(r.originId).x + this.classWidth/2, this.n(r.originId).y + (50 + this.n(r.originId).attributes.length*20)/2 + i*this.gap).y;

  angle(r: RelationEdge, i:number) { const dx = this.x2(r,i)-this.x1(r,i), dy = this.y2(r,i)-this.y1(r,i); return Math.atan2(dy,dx)*(180/Math.PI); }

  private mult(r: RelationEdge, i:number, which:'origin'|'target') {
    const x1v = this.x1(r,i), y1v = this.y1(r,i), x2v = this.x2(r,i), y2v = this.y2(r,i);
    const dx = x2v-x1v, dy = y2v-y1v, len = Math.sqrt(dx*dx + dy*dy);
    const factor = which==='origin'?this.multFactor:1-this.multFactor;
    const offset = this.multOffset;
    return { x: x1v + dx*factor + (dy/len)*offset, y: y1v + dy*factor - (dx/len)*offset };
  }

  multX = (r: RelationEdge,i:number,which:'origin'|'target') => this.mult(r,i,which).x;
  multY = (r: RelationEdge,i:number,which:'origin'|'target') => this.mult(r,i,which).y;

  down(e: MouseEvent, n: ClassNode) {
    if (['INPUT','BUTTON','SELECT'].includes((e.target as HTMLElement).tagName) || this.relO) return;
    const p=this.svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY;
    const sp=p.matrixTransform(this.svg.getScreenCTM()!.inverse());
    this.drag = n; this.offX = sp.x - n.x; this.offY = sp.y - n.y;
    this.selectedClass = n;
  }

  move(e: MouseEvent) {
    if(!this.drag) return;
    const p=this.svg.createSVGPoint(); p.x=e.clientX; p.y=e.clientY;
    const sp=p.matrixTransform(this.svg.getScreenCTM()!.inverse());
    // Ajustar a la cuadrícula con snap de 20px
    this.drag.x = Math.round((sp.x - this.offX) / 20) * 20;
    this.drag.y = Math.round((sp.y - this.offY) / 20) * 20;
  }

  up = () => this.drag = null;

  addClass() {
    this.saveHistory();
    const id = (Math.max(0,...this.d.classes.map(c=>+c.id)) + 1).toString();
    this.d.classes.push({id, name:'NuevaClase', attributes:[], x:50, y:50});
  }

  remClass(n: ClassNode) {
    this.d.relations = this.d.relations.filter(r=>r.originId!==n.id && r.targetId!==n.id);
    this.d.classes = this.d.classes.filter(c=>c.id!==n.id);
    if (this.selectedClass === n) {
      this.selectedClass = null;
    }
  }

  startRel = (n: ClassNode) => { this.relO=n; this.menu=true; this.type=null; };
  setType = (t: RelationEdge['type']) => { this.type=t; this.menu=false; };
  cancel = () => { this.relO=this.type=null; this.menu=false; };

  click(n: ClassNode, e: MouseEvent) {
    if (['INPUT','BUTTON','SELECT'].includes((e.target as HTMLElement).tagName)) return;
    
    // Seleccionar la clase
    this.selectedClass = n;
    
    if(this.relO && this.type && this.relO.id!==n.id) {
      const id = 'r'+(Math.max(0,...this.d.relations.map(r=>+r.id.slice(1)))+1);
      const multiplicities = this.type==='inheritance' ? { originMultiplicity:'1', targetMultiplicity:'1' } : { originMultiplicity:'1', targetMultiplicity:'*' };
      this.d.relations.push({id, type:this.type, originId:this.relO.id, targetId:n.id, ...multiplicities});
      this.relO = this.type = null;
    }
  }

  remRel = (r: RelationEdge) => this.d.relations = this.d.relations.filter(x=>x.id!==r.id);
}



