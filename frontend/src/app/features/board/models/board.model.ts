export interface Attribute {
  name: string;
  type: 'String' | 'Integer' | 'Real' | 'Boolean' | 'Date'; // restringido a los 5
  scope?: '+' | '-' | '#';
}

export interface ClassNode {
  id: string;
  name: string;
  attributes: Attribute[];
  x: number;
  y: number;
}

export interface RelationEdge {
  id: string;
  type: 'Asociacion' | 'Herencia' | 'Composicion' | 'Agregacion' | 'Dependencia';
  originId: string;
  targetId: string;
  originMultiplicity?: string;
  targetMultiplicity?: string;
}



export interface BoardDiagram {
  classes: ClassNode[];
  relations: RelationEdge[];
}
