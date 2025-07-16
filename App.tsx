import React, { useState } from 'react';
import {
  SafeAreaView, Text, TextInput, Button, View,
  StyleSheet, TouchableOpacity, Alert,
  KeyboardAvoidingView, Platform, Linking, ScrollView
} from 'react-native';
import axios from 'axios';
import { GOOGLE_API_KEY } from '@env';

export default function App() {
  const [usarCidade, setUsarCidade] = useState(false);
  const [distanciaManual, setDistanciaManual] = useState('');
  const [cidadeOrigem, setCidadeOrigem] = useState('');
  const [cidadeDestino, setCidadeDestino] = useState('');
  const [consumo, setConsumo] = useState('');
  const [preco, setPreco] = useState('');
  const [sugestoesOrigem, setSugestoesOrigem] = useState([]);
  const [sugestoesDestino, setSugestoesDestino] = useState([]);
  const [rotas, setRotas] = useState([]);
  const [evitarPedagio, setEvitarPedagio] = useState(false);
  const [resultado, setResultado] = useState<string | null>(null);

  const buscarCidades = async (cidade: string, tipo: 'origem' | 'destino') => {
    if (cidade.length < 3) return;

    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/place/autocomplete/json', {
        params: {
          input: cidade,
          types: 'geocode',
          language: 'pt-BR',
          key: GOOGLE_API_KEY,
        }
      });

      if (tipo === 'origem') {
        setSugestoesOrigem(response.data.predictions);
      } else {
        setSugestoesDestino(response.data.predictions);
      }
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar cidades.');
    }
  };

  const selecionarCidade = (cidade: string, tipo: 'origem' | 'destino') => {
    if (tipo === 'origem') {
      setCidadeOrigem(cidade);
      setSugestoesOrigem([]);
    } else {
      setCidadeDestino(cidade);
      setSugestoesDestino([]);
    }
  };

  const buscarRotas = async () => {
    try {
      const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
        params: {
          origin: cidadeOrigem,
          destination: cidadeDestino,
          alternatives: true,
          avoid: evitarPedagio ? 'tolls' : undefined,
          key: GOOGLE_API_KEY,
          language: 'pt-BR'
        }
      });
      setRotas(response.data.routes);
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível buscar rotas.');
    }
  };

  const calcular = async () => {
    const c = parseFloat(consumo);
    const p = parseFloat(preco);

    if (usarCidade) {
      if (!cidadeOrigem || !cidadeDestino || isNaN(c) || isNaN(p)) {
        Alert.alert('Atenção', 'Preencha todos os campos corretamente.');
        return;
      }
      await buscarRotas();
      return;
    }

    const distancia = parseFloat(distanciaManual);

    if (distancia > 0 && c > 0 && p > 0) {
      const litros = distancia / c;
      const total = litros * p;
      setResultado(`Distância: ${distancia.toFixed(1)} km\nCusto total da viagem: R$ ${total.toFixed(2)}`);
    } else {
      setResultado('Preencha todos os campos corretamente.');
    }
  };

  const abrirNoGoogleMaps = (rota) => {
    const url = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(cidadeOrigem)}&destination=${encodeURIComponent(cidadeDestino)}&travelmode=driving`;
    Linking.openURL(url);
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={styles.container}>
        <ScrollView keyboardShouldPersistTaps="handled">
          <Text style={styles.title}>Calculadora de Combustível</Text>

          <View style={styles.switcher}>
            <Button title="Usar KM manual" onPress={() => setUsarCidade(false)} color={!usarCidade ? '#0066cc' : '#aaa'} />
            <Button title="Usar cidades" onPress={() => setUsarCidade(true)} color={usarCidade ? '#0066cc' : '#aaa'} />
          </View>

          {usarCidade ? (
            <>
              <Text>Consumo médio (km/l):</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={consumo} onChangeText={setConsumo} />

              <Text>Preço do combustível (R$/litro):</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={setPreco} />

              <Text>Origem (cidade ou rua):</Text>
              <TextInput
                style={styles.input}
                value={cidadeOrigem}
                onChangeText={(text) => {
                  setCidadeOrigem(text);
                  buscarCidades(text, 'origem');
                }}
                placeholder="Ex: Viçosa"
              />
              {sugestoesOrigem.map((item) => (
                <TouchableOpacity key={item.place_id} onPress={() => selecionarCidade(item.description, 'origem')}>
                  <Text style={styles.suggestion}>{item.description}</Text>
                </TouchableOpacity>
              ))}

              <Text>destino (cidade ou rua):</Text>
              <TextInput
                style={styles.input}
                value={cidadeDestino}
                onChangeText={(text) => {
                  setCidadeDestino(text);
                  buscarCidades(text, 'destino');
                }}
                placeholder="Ex: Belo Horizonte"
              />
              {sugestoesDestino.map((item) => (
                <TouchableOpacity key={item.place_id} onPress={() => selecionarCidade(item.description, 'destino')}>
                  <Text style={styles.suggestion}>{item.description}</Text>
                </TouchableOpacity>
              ))}

              <View style={{ marginVertical: 10 }}>
                <TouchableOpacity onPress={() => setEvitarPedagio(!evitarPedagio)}>
                  <Text style={evitarPedagio ? styles.radioSelected : styles.radio}>
                    ⬤ {evitarPedagio ? 'Evitar pedágios (ativado)' : 'Evitar pedágios'}
                  </Text>
                </TouchableOpacity>
              </View>

              <Button title="Buscar Rotas" onPress={calcular} color="#0066cc" />

              {rotas.length > 0 && (
                <>
                  <Text style={styles.subTitle}>Rotas encontradas:</Text>
                  {rotas.map((rota, index) => {
                    const distanciaKm = rota.legs[0].distance.value / 1000;
                    const litros = distanciaKm / parseFloat(consumo || '1');
                    const custo = litros * parseFloat(preco || '0');

                    return (
                      <TouchableOpacity key={index} onPress={() => abrirNoGoogleMaps(rota)}>
                        <View style={styles.suggestion}>
                          <Text>Rota {index + 1}: {rota.legs[0].distance.text} - {rota.summary}</Text>
                          <Text style={{ marginTop: 5, color: '#007700' }}>
                            Custo estimado com combustível: R$ {custo.toFixed(2)}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </>
              )}
            </>
          ) : (
            <>
              <Text>Distância da viagem (km):</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={distanciaManual} onChangeText={setDistanciaManual} />

              <Text>Consumo médio (km/l):</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={consumo} onChangeText={setConsumo} />

              <Text>Preço do combustível (R$/litro):</Text>
              <TextInput style={styles.input} keyboardType="numeric" value={preco} onChangeText={setPreco} />

              <View style={styles.button}>
                <Button title="CALCULAR" onPress={calcular} color="#0066cc" />
              </View>

              {resultado && <Text style={styles.resultado}>{resultado}</Text>}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 20, backgroundColor: '#fff' },
  title: { fontSize: 22, fontWeight: 'bold', marginVertical: 20, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#ccc', padding: 10, marginVertical: 8, borderRadius: 5 },
  radio: { fontSize: 16, color: '#888' },
  radioSelected: { fontSize: 16, color: '#0066cc', fontWeight: 'bold' },
  button: { marginTop: 20 },
  resultado: { marginTop: 20, fontSize: 18, color: '#007700' },
  switcher: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  suggestion: { padding: 10, backgroundColor: '#f4f4f4', marginVertical: 5, borderRadius: 5 },
  subTitle: { marginTop: 20, fontSize: 18, fontWeight: 'bold' },
});
