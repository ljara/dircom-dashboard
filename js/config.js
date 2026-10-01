// Constantes: paleta de colores y campos del sistema

const PALETTE = [
  {hex:'#378ADD',bg:'rgba(55,138,221,.13)'},
  {hex:'#1F5A99',bg:'rgba(31,90,153,.13)'},
  {hex:'#1D9E75',bg:'rgba(29,158,117,.13)'},
  {hex:'#EF9F27',bg:'rgba(239,159,39,.13)'},
  {hex:'#D4537E',bg:'rgba(212,83,126,.13)'},
  {hex:'#D85A30',bg:'rgba(216,90,48,.13)'},
  {hex:'#5B8FA8',bg:'rgba(91,143,168,.13)'},
  {hex:'#7A9E3B',bg:'rgba(122,158,59,.13)'},
];

// Campos del sistema que no se muestran como campos extra editables
const SYSTEM_FIELDS_TAREA   = ['id','titulo','descripcion','coordId','asignado','status','prioridad','fecha','created','solicitante','tipo_requerimiento','categoria','link'];
const SYSTEM_FIELDS_PERSONA = ['id','nombre','rol','coordId','esJefe'];
