import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Image,
  StatusBar,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';



interface CurrencyAPIResponse {
  [key: string]: {
    code: string;
    codein: string;
    name: string;
    high: string;
    low: string;
    varBid: string;
    pctChange: string;
    bid: string;
    ask: string;
    timestamp: string;
    create_date: string;
  };
}

interface MarketData {
  id: string;
  pair: string;
  name: string;
  price: number;
  variation: number;
  variationValue: number;
  lastUpdate: string;
}

// --- 2. Utilitários ---
const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return '--:--';
  return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

export default function App() {
  const [data, setData] = useState<MarketData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  // --- 3. Lógica de Negócios ---
  const fetchMarketData = async () => {
    try {
      setError(null);
      
      const response = await fetch(
        'https://economia.awesomeapi.com.br/last/USD-BRL,EUR-BRL,BTC-BRL,GBP-BRL'
      );

      // Tratamento específico para Rate Limiting (Erro 429)
      if (response.status === 429) {
        throw new Error('Muitas atualizações recentes. Aguarde 30 segundos.');
      }

      if (!response.ok) {
        throw new Error(`Erro no servidor: ${response.status}`);
      }

      const json: CurrencyAPIResponse = await response.json();

      const formattedData: MarketData[] = Object.values(json)
        .filter((item: any) => item && item.name && item.bid)
        .map((item) => {
            const safeName = item.name ? item.name.split('/')[0] : 'Moeda';
            return {
                id: item.code,
                pair: `${item.code}/${item.codein}`,
                name: safeName, 
                price: parseFloat(item.bid),
                variation: parseFloat(item.pctChange),
                variationValue: parseFloat(item.varBid),
                lastUpdate: item.create_date,
            };
        });

      if (formattedData.length === 0) {
        setError('Nenhum dado encontrado na API.');
      } else {
        setData(formattedData);
        setLastFetchTime(new Date().toLocaleTimeString('pt-BR'));
      }

    } catch (err: any) {
      console.error('Falha ao buscar cotações:', err);
      setError(err.message || 'Erro de conexão. Verifique sua internet.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMarketData();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchMarketData();
  }, []);

  // --- 4. Componentes de UI ---

  const MarketCard = ({ item }: { item: MarketData }) => {
    const isPositive = item.variation >= 0;
    const variationColor = isPositive ? '#00C853' : '#D50000';
    const icon = isPositive ? '▲' : '▼';

    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <View>
            <Text style={styles.currencyCode}>{item.pair}</Text>
            <Text style={styles.currencyName}>{item.name}</Text>
          </View>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{formatCurrency(item.price)}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.cardFooter}>
          <Text style={styles.updateTime}>Atualizado às {formatTime(item.lastUpdate)}</Text>
          <View style={[styles.badge, { backgroundColor: variationColor + '15' }]}> 
            <Text style={[styles.variationText, { color: variationColor }]}>
              {icon} {item.variation}% (R$ {item.variationValue.toFixed(2)})
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const Header = () => (
    <View style={styles.headerContainer}>
      <View >
        <View style={{alignItems: 'center', display: 'flex', flexDirection: 'row', gap: 10, justifyContent: 'center'}}>
          <Image source={require('./assets/icon.png')}  style={styles.logo}/>
          <Text style={styles.appTitle}>FinLine</Text>
        </View>        
        <Text style={styles.appSubtitle}>Monitoramento Global</Text>
      </View>
      <View style={[styles.statusBadge, error ? { backgroundColor: '#FFEBEE' } : {}]}>
        <View style={[styles.onlineDot, error ? { backgroundColor: '#D32F2F' } : {}]} />
        <Text style={[styles.statusText, error ? { color: '#D32F2F' } : {}]}>
          {error ? 'Offline' : 'Ao vivo'}
        </Text>
      </View>
    </View>
  );

  // Componente de Erro Visual
  if (error && !refreshing && data.length === 0) {
    return (
      <View style={styles.container}>
         <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
         <View style={styles.centerContainer}>
            <Text style={styles.errorTitle}>Atenção</Text>
            <Text style={styles.errorMessage}>{error}</Text>
            
            <TouchableOpacity style={styles.retryButton} onPress={() => {
              setLoading(true);
              // Pequeno delay para evitar spam imediato no botão
              setTimeout(fetchMarketData, 500);
            }}>
              <Text style={styles.retryButtonText}>Tentar Novamente</Text>
            </TouchableOpacity>
         </View>
      </View>
    );
  }

  // --- 5. Renderização Principal ---

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#1A237E" />
        <Text style={styles.loadingText}>Sincronizando mercado...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#F5F6FA" />
      
      <FlatList
        data={data}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <MarketCard item={item} />}
        ListHeaderComponent={Header}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#1A237E']} />
        }
        ListFooterComponent={
          <Text style={styles.footerText}>
            Última verificação: {lastFetchTime} • Fonte: AwesomeAPI
          </Text>
        }
      />
    </View>
  );
}

// --- 6. Estilos ---
const styles = StyleSheet.create({
  logo: {
    width: 50,
    height: 40,
    marginBottom: 8,
  },
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F6FA',
    padding: 20,
  },
  loadingText: {
    marginTop: 12,
    color: '#546E7A',
    fontSize: 14,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#D32F2F',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#546E7A',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#1A237E',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
    marginTop: 8,
  },
  appTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A237E',
    letterSpacing: -0.5,
  },
  appSubtitle: {
    fontSize: 14,
    color: '#78909C',
    fontWeight: '500',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8EAF6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00C853',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#1A237E',
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#1A237E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#ECEFF1',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: '700',
    color: '#263238',
  },
  currencyName: {
    fontSize: 13,
    color: '#78909C',
    marginTop: 2,
  },
  priceContainer: {
    alignItems: 'flex-end',
  },
  price: {
    fontSize: 22,
    fontWeight: '700',
    color: '#263238',
    letterSpacing: -0.5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F5F5F5',
    marginVertical: 16,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  updateTime: {
    fontSize: 12,
    color: '#90A4AE',
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  variationText: {
    fontSize: 13,
    fontWeight: '700',
  },
  footerText: {
    textAlign: 'center',
    color: '#B0BEC5',
    fontSize: 12,
    marginTop: 20,
  },
});