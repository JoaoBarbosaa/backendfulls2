import Hospede from "../Modelo/Hospede.js";
import PessoaFisica from "../Modelo/PessoaFisica.js";
import PessoaJuridica from "../Modelo/PessoaJuridica.js";
import conectar from "./Conexao.js";


export default class HospedeBD {


  async gravarHospede(hospede) {
    const conexao = await conectar();

    const inserirHospedeSQL = "INSERT INTO hospede (nome, email, endereco) VALUES (?, ?, ?)";
    const valoresHospede = [hospede.nome, hospede.email, hospede.endereco];
    const [resultadoHospede] = await conexao.query(inserirHospedeSQL, valoresHospede);

    // Verifica se a inserção no hospede foi bem-sucedida
    if (resultadoHospede.affectedRows !== 1) {
      throw new Error("Falha ao inserir hospede.");
    }

    // Obtém o último ID inserido na tabela hospede
    const ultimoIdHospede = resultadoHospede.insertId;

    // Verifica se o hospede é Pessoa Física
    if (hospede instanceof PessoaFisica) {
      const inserirPessoaFisicaSQL = "INSERT INTO pessoafisica (cpf, rg, hospede_codigo) VALUES (?, ?, ?)";
      const valoresPessoaFisica = [hospede.cpf, hospede.rg, ultimoIdHospede];

      // Tenta inserir na tabela pessoafisica
      const [resultadoPessoaFisica] = await conexao.query(inserirPessoaFisicaSQL, valoresPessoaFisica);

      // Verifica se a inserção na pessoafisica foi bem-sucedida
      if (resultadoPessoaFisica.affectedRows !== 1) {
        throw new Error("Falha ao inserir dados na tabela pessoafisica.");
      }
    } else if (hospede instanceof PessoaJuridica) {
      const inserirPessoaJuridicaSQL = "INSERT INTO pessoajuridica (cnpj, hospede_codigo) VALUES (?, ?)";
      const valoresPessoaJuridica = [hospede.cnpj, ultimoIdHospede];

      // Tenta inserir na tabela pessoajuridica
      const [resultadoPessoaJuridica] = await conexao.query(inserirPessoaJuridicaSQL, valoresPessoaJuridica);

      // Verifica se a inserção na pessoajuridica foi bem-sucedida
      if (resultadoPessoaJuridica.affectedRows !== 1) {
        throw new Error("Falha ao inserir dados na tabela pessoajuridica.");
      }
    }

    // Retorna o ID do hospede inserido
    return ultimoIdHospede;
  }

  async gravarTelefone(telefone) {
    const conexao = await conectar();

    const inserirTelefoneSQL = "INSERT INTO telefone (ddd, numero, codHospede) VALUES (?, ?, ?)";
    const valoresTelefone = [telefone.ddd, telefone.numero, telefone.codHospede];
    const [resultadoTelefone] = await conexao.query(inserirTelefoneSQL, valoresTelefone);

    // Verifica se a inserção no telefone foi bem-sucedida
    if (resultadoTelefone.affectedRows !== 1) {
      throw new Error("Falha ao inserir telefone.");
    }

    // Obtém o último ID inserido na tabela telefone
    const ultimoIdTelefone = resultadoTelefone.insertId;

    // Retorna o ID do telefone inserido
    return ultimoIdTelefone;
  }
  

  async consultar(termo) {
    const conexao = await conectar();

    const termoCpf = termo ? `%${termo}%` : '%';
    const termoCnpj = termo ? `%${termo}%` : '%';

    const sql = `
        SELECT
            h.codigo,
            h.nome,
            h.endereco,
            h.email,
            pf.cpf,
            pf.rg,
            NULL AS cnpj,
            'Pessoa Física' AS tipo,
            t.codigo AS codigoTelefone,
            t.ddd,
            t.numero
        FROM
            hospede h
            LEFT JOIN pessoafisica pf ON h.codigo = pf.hospede_codigo
            LEFT JOIN telefone t ON h.codigo = t.codHospede
        WHERE
            pf.cpf LIKE ?
    
        UNION
    
        SELECT
            h.codigo,
            h.nome,
            h.endereco,
            h.email,
            NULL AS cpf,
            NULL AS rg,
            pj.cnpj,
            'Pessoa Jurídica' AS tipo,
            t.codigo AS codigoTelefone,
            t.ddd,
            t.numero
        FROM
            hospede h
            LEFT JOIN pessoajuridica pj ON h.codigo = pj.hospede_codigo
            LEFT JOIN telefone t ON h.codigo = t.codHospede
        WHERE
            pj.cnpj LIKE ?
    `;


    const valores = [termoCpf, termoCnpj];
    const [rows] = await conexao.query(sql, valores);

    const resultadoFinal = [];

    for (let i = 0; i < rows.length; i++) {
      const item = {
        codigo: rows[i].codigo,
        nome: rows[i].nome,
        endereco: rows[i].endereco,
        email: rows[i].email,
        tipo: rows[i].tipo,
        telefones: {
          codigoTelefone: rows[i].codigoTelefone,
          ddd: rows[i].ddd,
          numero: rows[i].numero
        }

      };

      if (rows[i].tipo === 'Pessoa Física') {
        item.cpf = rows[i].cpf;
        item.rg = rows[i].rg;
      } else if (rows[i].tipo === 'Pessoa Jurídica') {
        item.cnpj = rows[i].cnpj;
      }

      resultadoFinal.push(item);
    }

    return resultadoFinal;
  }

  async consultarCodigo(codigo) {
    const conexao = await conectar();

    const sql = `
        -- Consulta para Pessoa Física
        SELECT
            h.codigo,
            h.nome,
            h.endereco,
            h.email,
            pf.cpf,
            pf.rg,
            NULL AS cnpj,
            'Pessoa Física' AS tipo,
            t.codigo AS codigoTelefone,
            t.ddd,
            t.numero
        FROM
            hospede h
            LEFT JOIN pessoafisica pf ON h.codigo = pf.hospede_codigo
            LEFT JOIN telefone t ON h.codigo = t.codHospede
        WHERE
            h.codigo = ? AND pf.cpf IS NOT NULL
        
        UNION
        
        -- Consulta para Pessoa Jurídica
        SELECT
            h.codigo,
            h.nome,
            h.endereco,
            h.email,
            NULL AS cpf,
            NULL AS rg,
            pj.cnpj,
            'Pessoa Jurídica' AS tipo,
            t.codigo AS codigoTelefone,
            t.ddd,
            t.numero
        FROM
            hospede h
            LEFT JOIN pessoajuridica pj ON h.codigo = pj.hospede_codigo
            LEFT JOIN telefone t ON h.codigo = t.codHospede
        WHERE
            h.codigo = ? AND pj.cnpj IS NOT NULL
        
        `;

    const valores = [codigo, codigo];
    const [rows] = await conexao.query(sql, valores);

    const resultadoFinal = [];

    for (let i = 0; i < rows.length; i++) {
      const item = {
        codigo: rows[i].codigo,
        nome: rows[i].nome,
        endereco: rows[i].endereco,
        email: rows[i].email,
        tipo: rows[i].tipo,
        telefones: {
          codigoTelefone: rows[i].codigoTelefone,
          ddd: rows[i].ddd,
          numero: rows[i].numero
        }
      };

      if (rows[i].tipo === 'Pessoa Física') {
        item.cpf = rows[i].cpf;
        item.rg = rows[i].rg;
      } else if (rows[i].tipo === 'Pessoa Jurídica') {
        item.cnpj = rows[i].cnpj;
      }

      resultadoFinal.push(item);
    }

    return resultadoFinal;
  }


}